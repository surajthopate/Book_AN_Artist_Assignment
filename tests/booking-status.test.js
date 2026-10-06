const bcrypt = require('bcryptjs');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockUsers = {
  1: {
    id: 1,
    role: 'artist',
    name: 'Ava Stone',
    email: 'artist@example.com',
    password: bcrypt.hashSync('Password123!', 10),
  },
  2: {
    id: 2,
    role: 'client',
    name: 'Leo Grant',
    email: 'client@example.com',
    password: bcrypt.hashSync('Password123!', 10),
  },
};

const mockBookings = [];
const mockReviews = [];

jest.mock('../src/models/user.model', () => ({
  findById: jest.fn(async (id) => mockUsers[Number(id)] || null),
  findByEmail: jest.fn(async (email) => Object.values(mockUsers).find((user) => user.email.toLowerCase() === String(email).toLowerCase()) || null),
}));

jest.mock('../src/models/review.model', () => ({
  getReviewsByArtist: jest.fn(async (artistId) => mockReviews.filter((review) => Number(review.artist_id) === Number(artistId))),
}));

jest.mock('../src/models/booking.model', () => ({
  findBookingById: jest.fn(async (id) => mockBookings.find((booking) => Number(booking.id) === Number(id)) || null),
  addBooking: jest.fn(async (booking) => {
    const nextId = mockBookings.length ? Math.max(...mockBookings.map((item) => Number(item.id))) + 1 : 1;
    const createdBooking = { id: nextId, ...booking };
    mockBookings.push(createdBooking);
    return createdBooking;
  }),
  updateBookingStatus: jest.fn(async (id, status) => {
    const booking = mockBookings.find((item) => Number(item.id) === Number(id));
    if (!booking) return null;
    booking.status = status;
    return booking;
  }),
  getAllBookings: jest.fn(async () => mockBookings),
  resetBookings: jest.fn(async () => {
    mockBookings.length = 0;
    mockReviews.length = 0;
  }),
}));

const app = require('../src/app');
const env = require('../src/config/env');
const { resetBookings } = require('../src/models/booking.model');

beforeEach(async () => {
  await resetBookings();
  mockUsers[1].password = bcrypt.hashSync('Password123!', 10);
  mockUsers[2].password = bcrypt.hashSync('Password123!', 10);
});

describe('Health API', () => {
  it('returns app health status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });
});

describe('Authentication API', () => {
  it('logs in a user with valid credentials', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'client@example.com', password: 'Password123!' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('client@example.com');
    expect(response.body.data.token).toBeTruthy();
  });

  it('rejects invalid login credentials', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'client@example.com', password: 'WrongPassword' });

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/Invalid credentials/i);
  });

  it('requires email and password for login', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'client@example.com' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/Email and password are required/i);
  });
});

describe('Booking API', () => {
  it('creates a booking for a valid client request', async () => {
    const clientToken = jwt.sign({ sub: 2, role: 'client', iat: Date.now() / 1000 }, env.JWT_SECRET, { expiresIn: '1h' });

    const response = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        artist_id: 1,
        event_start: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
        event_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 2).toISOString(),
        notes: 'New booking',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('pending');
    expect(response.body.data.client_id).toBe(2);
  });

  it('rejects booking creation for a non-existent artist', async () => {
    const clientToken = jwt.sign({ sub: 2, role: 'client', iat: Date.now() / 1000 }, env.JWT_SECRET, { expiresIn: '1h' });

    const response = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        artist_id: 999,
        event_start: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
        event_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 2).toISOString(),
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/Artist not found/i);
  });

  it('rejects overlapping confirmed bookings', async () => {
    const clientToken = jwt.sign({ sub: 2, role: 'client', iat: Date.now() / 1000 }, env.JWT_SECRET, { expiresIn: '1h' });
    const overlappingStart = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString();
    const overlappingEnd = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 2).toISOString();

    mockBookings.push({
      id: 1,
      artist_id: 1,
      client_id: 2,
      event_start: overlappingStart,
      event_end: overlappingEnd,
      notes: 'Existing booking',
      status: 'confirmed',
    });

    const response = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        artist_id: 1,
        event_start: overlappingStart,
        event_end: overlappingEnd,
        notes: 'Duplicate slot',
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/already has a confirmed booking/i);
  });

  it('allows a valid status transition', async () => {
    const artistToken = jwt.sign({ sub: 1, role: 'artist', iat: Date.now() / 1000 }, env.JWT_SECRET, { expiresIn: '1h' });

    const bookingResponse = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${jwt.sign({ sub: 2, role: 'client', iat: Date.now() / 1000 }, env.JWT_SECRET, { expiresIn: '1h' })}`)
      .send({
        artist_id: 1,
        event_start: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
        event_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 60 * 2).toISOString(),
        notes: 'Transition test',
      });

    const response = await request(app)
      .patch(`/bookings/${bookingResponse.body.data.id}/status`)
      .set('Authorization', `Bearer ${artistToken}`)
      .send({ status: 'confirmed' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('confirmed');
  });

  it('returns 422 for an invalid transition', async () => {
    const clientToken = jwt.sign({ sub: 2, role: 'client', iat: Date.now() / 1000 }, env.JWT_SECRET, { expiresIn: '1h' });
    const artistToken = jwt.sign({ sub: 1, role: 'artist', iat: Date.now() / 1000 }, env.JWT_SECRET, { expiresIn: '1h' });

    const bookingResponse = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        artist_id: 1,
        event_start: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
        event_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 2).toISOString(),
        notes: 'Testing invalid transition',
      });

    expect(bookingResponse.status).toBe(201);

    const invalidTransitionResponse = await request(app)
      .patch(`/bookings/${bookingResponse.body.data.id}/status`)
      .set('Authorization', `Bearer ${artistToken}`)
      .send({ status: 'completed' });

    expect(invalidTransitionResponse.status).toBe(422);
    expect(invalidTransitionResponse.body.error).toMatch(/Invalid transition from pending to completed/i);
  });
});

describe('Artist reviews API', () => {
  it('returns artist review data with summary metadata', async () => {
    mockBookings.push({
      id: 1,
      artist_id: 1,
      client_id: 2,
      event_start: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      event_end: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5 + 1000 * 60 * 60 * 2).toISOString(),
      status: 'completed',
    });

    mockBookings.push({
      id: 2,
      artist_id: 1,
      client_id: 2,
      event_start: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
      event_end: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10 + 1000 * 60 * 60 * 2).toISOString(),
      status: 'completed',
    });

    mockReviews.push(
      { id: 1, artist_id: 1, booking_id: 1, score: 5, comment: 'Excellent', created_at: new Date().toISOString() },
      { id: 2, artist_id: 1, booking_id: 2, score: 4, comment: 'Good', created_at: new Date().toISOString() }
    );

    const response = await request(app).get('/artists/1/reviews?page=1&limit=10');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.artist_id).toBe(1);
    expect(response.body.data.summary.total_count).toBe(2);
    expect(response.body.data.reviews.length).toBe(2);
  });

  it('returns an empty review list when the artist has no completed reviews', async () => {
    const response = await request(app).get('/artists/1/reviews?page=1&limit=10');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.reviews).toEqual([]);
    expect(response.body.data.summary.total_count).toBe(0);
    expect(response.body.data.summary.average_score).toBe(0);
  });
});
