const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { findByEmail } = require('../models/user.model');

// Authenticate a user, validate the password, and issue a signed JWT.
async function login(email, password) {
  const user = await findByEmail(email);

  if (!user) {
    const error = new Error('Invalid credentials.');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    const error = new Error('Invalid credentials.');
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
  };
}

module.exports = {
  login,
};
