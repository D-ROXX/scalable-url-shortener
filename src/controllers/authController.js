const authService = require('../services/authService');

async function register(req, res) {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result });
}

async function login(req, res) {
  const result = await authService.login(req.body);
  res.status(200).json({ success: true, data: result });
}

async function refresh(req, res) {
  const { refreshToken } = req.body;
  const accessToken = authService.refreshAccessToken(refreshToken);
  res.status(200).json({ success: true, data: { accessToken } });
}

module.exports = { register, login, refresh };
