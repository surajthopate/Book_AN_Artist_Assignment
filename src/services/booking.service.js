const { findBookingById, addBooking, updateBookingStatus, getAllBookings } = require('../models/booking.model');
const { findById } = require('../models/user.model');

function hasOverlap(startA, endA, startB, endB) {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
}

async function createBooking({ userId, artist_id, event_start, event_end, notes }) {
  if (!artist_id || !event_start || !event_end) {
    const error = new Error('artist_id, event_start, and event_end are required.');
    error.statusCode = 400;
    throw error;
  }

  const artist = await findById(artist_id);
  if (!artist || artist.role !== 'artist') {
    const error = new Error('Artist not found.');
    error.statusCode = 404;
    throw error;
  }

  const start = new Date(event_start);
  const end = new Date(event_end);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const error = new Error('event_start and event_end must be valid dates.');
    error.statusCode = 400;
    throw error;
  }

  if (start <= now) {
    const error = new Error('event_start must be in the future.');
    error.statusCode = 400;
    throw error;
  }

  if (end <= start) {
    const error = new Error('event_end must be after event_start.');
    error.statusCode = 400;
    throw error;
  }

  const bookings = await getAllBookings();
  const overlappingConfirmed = bookings.some((booking) => {
    return (
      Number(booking.artist_id) === Number(artist_id) &&
      booking.status === 'confirmed' &&
      hasOverlap(event_start, event_end, booking.event_start, booking.event_end)
    );
  });

  if (overlappingConfirmed) {
    const error = new Error('The artist already has a confirmed booking overlapping this time window.');
    error.statusCode = 409;
    throw error;
  }

  const newBooking = {
    artist_id: Number(artist_id),
    client_id: Number(userId),
    event_start: start.toISOString(),
    event_end: end.toISOString(),
    notes: notes || '',
    status: 'pending',
  };

  return addBooking(newBooking);
}

async function changeBookingStatus({ userId, userRole, bookingId, nextStatus }) {
  const booking = await findBookingById(bookingId);

  if (!booking) {
    const error = new Error('Booking not found.');
    error.statusCode = 404;
    throw error;
  }

  const allowedTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['in_progress', 'cancelled'],
    in_progress: ['completed'],
    completed: [],
    cancelled: [],
  };

  if (!allowedTransitions[booking.status] || !allowedTransitions[booking.status].includes(nextStatus)) {
    const error = new Error(`Invalid transition from ${booking.status} to ${nextStatus}.`);
    error.statusCode = 422;
    throw error;
  }

  if (nextStatus === 'confirmed' || nextStatus === 'in_progress' || nextStatus === 'completed') {
    if (userRole !== 'artist') {
      const error = new Error('Clients can only cancel bookings.');
      error.statusCode = 403;
      throw error;
    }

    if (Number(booking.artist_id) !== Number(userId)) {
      const error = new Error('You can only update bookings assigned to you.');
      error.statusCode = 403;
      throw error;
    }
  }

  if (nextStatus === 'cancelled') {
    const isClientOwner = Number(booking.client_id) === Number(userId) && userRole === 'client';
    const isArtistOwner = Number(booking.artist_id) === Number(userId) && userRole === 'artist';

    if (!isClientOwner && !isArtistOwner) {
      const error = new Error('Only the booking client or artist can cancel this booking.');
      error.statusCode = 403;
      throw error;
    }
  }

  return updateBookingStatus(bookingId, nextStatus);
}

module.exports = {
  createBooking,
  changeBookingStatus,
};
