const { getMongoDb } = require('../config/database');

async function getReviewsByArtist(artistId) {
  const db = await getMongoDb();
  if (!db) {
    return [];
  }

  return db.collection('reviews')
    .find({ artist_id: Number(artistId) })
    .sort({ created_at: -1 })
    .toArray();
}

module.exports = {
  getReviewsByArtist,
};
