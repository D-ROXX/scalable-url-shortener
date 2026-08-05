const express = require('express');
const urlController = require('../controllers/urlController');
const rateLimiter = require('../middlewares/rateLimiter');

const router = express.Router();

// Redirects are the highest-traffic, unauthenticated path, so the limit
// is generous and keyed by IP (there's no req.user here).
const redirectLimiter = rateLimiter({ windowMs: 60_000, max: 200, keyPrefix: 'rl:redirect' });

router.get('/:shortCode', redirectLimiter, urlController.redirect);

module.exports = router;
