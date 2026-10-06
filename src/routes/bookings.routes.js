const express = require('express');
const { createBookingRequest, updateBookingStatusAction } = require('../controllers/bookingController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, requireRole('client'), createBookingRequest);
router.patch('/:id/status', authenticate, updateBookingStatusAction);

module.exports = router;
