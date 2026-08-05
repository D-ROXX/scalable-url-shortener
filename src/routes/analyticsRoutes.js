const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.get('/analytics/:id', authenticate, analyticsController.getSummary);

module.exports = router;
