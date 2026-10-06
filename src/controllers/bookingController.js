const { createBooking, changeBookingStatus } = require('../services/booking.service');

async function createBookingRequest(req, res, next) {
  try {
    const booking = await createBooking({
      userId: req.user.id,
      artist_id: req.body.artist_id,
      event_start: req.body.event_start,
      event_end: req.body.event_end,
      notes: req.body.notes,
    });

    return res.status(201).json({
      success: true,
      data: booking,
      error: null,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateBookingStatusAction(req, res, next) {
  try {
    const { status } = req.body || {};

    if (!status) {
      return res.status(400).json({
        success: false,
        data: {},
        error: 'status is required.',
      });
    }

    const booking = await changeBookingStatus({
      userId: req.user.id,
      userRole: req.user.role,
      bookingId: req.params.id,
      nextStatus: status,
    });

    return res.status(200).json({
      success: true,
      data: booking,
      error: null,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createBookingRequest,
  updateBookingStatusAction,
};
