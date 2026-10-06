const express = require('express');
const { listArtistReviews } = require('../controllers/artistController');

const router = express.Router();

router.get('/:id/reviews', listArtistReviews);

module.exports = router;
