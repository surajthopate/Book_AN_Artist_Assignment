const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { findById } = require('../models/user.model');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      data: {},
      error: 'Authentication required.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await findById(decoded.sub);

    if (!user) {
      return res.status(401).json({
        success: false,
        data: {},
        error: 'Authentication failed.',
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      data: {},
      error: 'Invalid or expired token.',
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        data: {},
        error: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        data: {},
        error: `Access denied. Allowed roles: ${allowedRoles.join(', ')}`,
      });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  requireRole,
};
