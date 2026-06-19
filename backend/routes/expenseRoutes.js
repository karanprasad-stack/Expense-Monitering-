const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getExpenses, createExpense } = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');

router.route('/')
  .get(protect, getExpenses)
  .post(
    protect,
    [
      body('amount')
        .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
      body('description')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 200 }).withMessage('Description must not exceed 200 characters'),
      body('date')
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601().withMessage('Please provide a valid date'),
      body('categoryId')
        .isMongoId().withMessage('Invalid Category ID'),
      body('subcategoryId')
        .isMongoId().withMessage('Invalid Subcategory ID'),
      body('paymentMethod')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isString().withMessage('Payment method must be a string'),
      body('isRecurring')
        .optional({ nullable: true, checkFalsy: true })
        .isBoolean().withMessage('isRecurring must be a boolean'),
      validate
    ],
    createExpense
  );

module.exports = router;
