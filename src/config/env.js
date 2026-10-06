require('dotenv').config();

const env = {
  PORT: Number(process.env.PORT) || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'local-dev-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
};

module.exports = env;
