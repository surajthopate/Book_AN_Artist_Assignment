const { getArtistReviews } = require('../services/review.service');

async function listArtistReviews(req, res, next) {
  try {
    const { id } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await getArtistReviews({
      artistId: id,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listArtistReviews,
};
