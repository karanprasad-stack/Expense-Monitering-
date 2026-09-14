const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const {
  getBudget,
  getAllBudgets,
  createOrUpdateBudget,
  copyBudget
} = require('../controllers/budgetController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');

router.get('/all', protect, getAllBudgets);

router.post(
  '/copy',
  protect,
  [
    body('sourceMonth')
      .isInt({ min: 1, max: 12 }).withMessage('Source month must be between 1 and 12'),
    body('sourceYear')
      .isInt({ min: 2000, max: 2100 }).withMessage('Source year must be a valid 4-digit year'),
    body('targetMonth')
      .isInt({ min: 1, max: 12 }).withMessage('Target month must be between 1 and 12'),
    body('targetYear')
      .isInt({ min: 2000, max: 2100 }).withMessage('Target year must be a valid 4-digit year'),
    body('mode')
      .optional()
      .isIn(['replace', 'merge']).withMessage('Mode must be replace or merge'),
    validate
  ],
  copyBudget
);

router.route('/')
  .get(
    protect,
    [
      query('month')
        .isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
      query('year')
        .isInt({ min: 2000, max: 2100 }).withMessage('Year must be a valid 4-digit year'),
      validate
    ],
    getBudget
  )
  .post(
    protect,
    [
      body('month')
        .isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
      body('year')
        .isInt({ min: 2000, max: 2100 }).withMessage('Year must be a valid 4-digit year'),
      body('totalBudget')
        .isFloat({ min: 0.01 }).withMessage('Total budget must be a positive number'),
      validate
    ],
    createOrUpdateBudget
  );

module.exports = router;

