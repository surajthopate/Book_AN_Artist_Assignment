const express = require('express');
const authRoutes = require('./routes/auth.routes');
const bookingRoutes = require('./routes/bookings.routes');
const artistRoutes = require('./routes/artists.routes');
const healthRoutes = require('./routes/health.routes');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok' },
    error: null,
  });
});

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/bookings', bookingRoutes);
app.use('/artists', artistRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: {},
    error: 'Route not found.',
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    data: {},
    error: error.message || 'Internal server error.',
  });
});

module.exports = app;
