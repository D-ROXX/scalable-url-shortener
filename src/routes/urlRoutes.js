const express = require('express');
const urlController = require('../controllers/urlController');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const rateLimiter = require('../middlewares/rateLimiter');
const { createUrlSchema } = require('../validators/schemas');

const router = express.Router();

const createLimiter = rateLimiter({ windowMs: 60_000, max: 30, keyPrefix: 'rl:create' });

router.post('/urls', authenticate, createLimiter, validate(createUrlSchema), urlController.createUrl);
router.get('/urls', authenticate, urlController.listUrls);
router.delete('/urls/:id', authenticate, urlController.deleteUrl);

module.exports = router;
