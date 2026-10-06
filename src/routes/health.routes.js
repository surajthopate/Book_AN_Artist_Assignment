const express = require('express');
const { pingDatabases } = require('../services/database.service');

const router = express.Router();

router.get('/db', async (req, res) => {
  try {
    const status = await pingDatabases();
    return res.status(200).json({
      success: true,
      data: status,
      error: null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: {},
      error: error.message || 'Database connection failed.',
    });
  }
});

module.exports = router;
