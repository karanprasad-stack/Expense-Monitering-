const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const { getDashboardSummary } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');

router.get(
  '/',
  protect,
  [
    query('month')
      .isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    query('year')
      .isInt({ min: 2000, max: 2100 }).withMessage('Year must be a valid 4-digit year'),
    validate
  ],
  getDashboardSummary
);

module.exports = router;
