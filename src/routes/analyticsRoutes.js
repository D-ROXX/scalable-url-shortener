const express = require('express');

const analyticsController = require('../controllers/analyticsController');

const {
  authenticate,
} = require('../middlewares/auth');

const router = express.Router();

// ============================================================
// ANALYTICS
// ============================================================
//
// Examples:
//
// GET /api/analytics/1
// GET /api/analytics/1?days=7
// GET /api/analytics/1?days=30
// GET /api/analytics/1?days=90
//
// ============================================================

router.get(
  '/analytics/:id',
  authenticate,
  analyticsController.getSummary
);

module.exports = router;