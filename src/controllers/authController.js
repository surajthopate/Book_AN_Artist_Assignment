const { login } = require('../services/auth.service');

async function loginUser(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        data: {},
        error: 'Email and password are required.',
      });
    }

    const result = await login(email, password);
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
  loginUser,
};
