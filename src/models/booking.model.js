const { getMySQLPool } = require('../config/database');

async function findBookingById(id) {
  const pool = await getMySQLPool();
  if (!pool) {
    return null;
  }

  const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ? LIMIT 1', [Number(id)]);
  return rows[0] || null;
}

async function addBooking(booking) {
  const pool = await getMySQLPool();
  if (!pool) {
    throw new Error('MySQL is not available.');
  }

  const [result] = await pool.query(
    'INSERT INTO bookings (artist_id, client_id, event_start, event_end, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
    [
      booking.artist_id,
      booking.client_id,
      booking.event_start,
      booking.event_end,
      booking.notes || '',
      booking.status,
    ]
  );

  return {
    ...booking,
    id: result.insertId,
  };
}

async function updateBookingStatus(id, status) {
  const pool = await getMySQLPool();
  if (!pool) {
    return null;
  }

  await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, Number(id)]);
  return findBookingById(id);
}

async function getAllBookings() {
  const pool = await getMySQLPool();
  if (!pool) {
    return [];
  }

  const [rows] = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
  return rows;
}

async function resetBookings() {
  const pool = await getMySQLPool();
  if (!pool) {
    return;
  }

  await pool.query('DELETE FROM bookings');
}

module.exports = {
  findBookingById,
  addBooking,
  updateBookingStatus,
  getAllBookings,
  resetBookings,
};
