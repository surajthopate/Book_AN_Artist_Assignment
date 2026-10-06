const { getReviewsByArtist } = require('../models/review.model');
const { findBookingById } = require('../models/booking.model');

async function getArtistReviews({ artistId, page = 1, limit = 10 }) {
  const reviews = await getReviewsByArtist(artistId);
  const completedReviews = [];

  for (const review of reviews) {
    const booking = await findBookingById(review.booking_id);
    if (booking && booking.status === 'completed') {
      completedReviews.push(review);
    }
  }

  const sortedReviews = completedReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const safePage = Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number(limit) > 0 ? Number(limit) : 10;

  const startIndex = (safePage - 1) * safeLimit;
  const paginatedReviews = sortedReviews.slice(startIndex, startIndex + safeLimit);

  const totalCount = sortedReviews.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  sortedReviews.forEach((review) => {
    distribution[review.score] += 1;
  });

  const averageScore = totalCount > 0 ? sortedReviews.reduce((sum, review) => sum + review.score, 0) / totalCount : 0;

  return {
    artist_id: Number(artistId),
    reviews: paginatedReviews,
    summary: {
      average_score: Number(averageScore.toFixed(2)),
      total_count: totalCount,
      score_distribution: distribution,
    },
    page: safePage,
    limit: safeLimit,
    total_pages: totalCount > 0 ? Math.ceil(totalCount / safeLimit) : 1,
  };
}

module.exports = {
  getArtistReviews,
};
