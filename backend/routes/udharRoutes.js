const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
  getUdharOverview,
  getPeople,
  createPerson,
  updatePerson,
  deletePerson,
  getPersonHistory,
  createUdharTransaction,
  updateUdharTransaction,
  deleteUdharTransaction
} = require('../controllers/udharController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');

// Overview Route
router.get('/overview', protect, getUdharOverview);

// People Routes
router.route('/people')
  .get(
    protect,
    [
      query('search').optional().trim(),
      query('status').optional().isIn(['ALL', 'THEY_OWE_ME', 'I_OWE_THEM', 'SETTLED']).withMessage('Invalid status filter'),
      validate
    ],
    getPeople
  )
  .post(
    protect,
    [
      body('name').trim().notEmpty().withMessage('Person name is required').isLength({ max: 100 }).withMessage('Name too long'),
      body('phone').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 20 }).withMessage('Phone number too long'),
      body('note').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 300 }).withMessage('Note too long'),
      validate
    ],
    createPerson
  );

router.route('/people/:id')
  .put(
    protect,
    [
      param('id').isMongoId().withMessage('Invalid Person ID'),
      body('name').optional().trim().notEmpty().withMessage('Person name cannot be empty'),
      body('phone').optional({ nullable: true, checkFalsy: true }).trim(),
      body('note').optional({ nullable: true, checkFalsy: true }).trim(),
      validate
    ],
    updatePerson
  )
  .delete(
    protect,
    [
      param('id').isMongoId().withMessage('Invalid Person ID'),
      validate
    ],
    deletePerson
  );

router.get(
  '/people/:id/transactions',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid Person ID'),
    validate
  ],
  getPersonHistory
);

// Transaction Routes
router.route('/transactions')
  .post(
    protect,
    [
      body('personId').isMongoId().withMessage('Valid Person ID is required'),
      body('type').isIn(['GAVE', 'RECEIVED']).withMessage('Transaction type must be GAVE or RECEIVED'),
      body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
      body('date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Please provide a valid date'),
      body('description').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Description must not exceed 200 characters'),
      validate
    ],
    createUdharTransaction
  );

router.route('/transactions/:id')
  .put(
    protect,
    [
      param('id').isMongoId().withMessage('Invalid Transaction ID'),
      body('personId').optional().isMongoId().withMessage('Valid Person ID is required'),
      body('type').optional().isIn(['GAVE', 'RECEIVED']).withMessage('Transaction type must be GAVE or RECEIVED'),
      body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
      body('date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Please provide a valid date'),
      body('description').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Description must not exceed 200 characters'),
      validate
    ],
    updateUdharTransaction
  )
  .delete(
    protect,
    [
      param('id').isMongoId().withMessage('Invalid Transaction ID'),
      validate
    ],
    deleteUdharTransaction
  );

module.exports = router;
