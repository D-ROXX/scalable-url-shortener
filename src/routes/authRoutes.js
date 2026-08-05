const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middlewares/validate');
const rateLimiter = require('../middlewares/rateLimiter');
const { registerSchema, loginSchema } = require('../validators/schemas');

const router = express.Router();

// Tighter limit on auth endpoints — brute-force login attempts are the
// main threat here, not general traffic.
const authLimiter = rateLimiter({ windowMs: 60_000, max: 10, keyPrefix: 'rl:auth' });

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, authController.refresh);

module.exports = router;
