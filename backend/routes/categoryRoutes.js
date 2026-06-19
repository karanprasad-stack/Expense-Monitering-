const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const {
  getCategories,
  createCategory,
  createSubcategory,
  updateCategory,
  deleteCategory,
  updateSubcategory,
  deleteSubcategory
} = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');

router.route('/')
  .get(
    protect,
    [
      query('budgetId').isMongoId().withMessage('Invalid Budget ID'),
      validate
    ],
    getCategories
  )
  .post(
    protect,
    [
      body('name').trim().notEmpty().withMessage('Category name is required').isLength({ max: 100 }).withMessage('Category name must not exceed 100 characters'),
      body('budgetId').isMongoId().withMessage('Invalid Budget ID'),
      validate
    ],
    createCategory
  );

router.route('/:categoryId/subcategories')
  .post(
    protect,
    [
      param('categoryId').isMongoId().withMessage('Invalid Category ID'),
      body('name').trim().notEmpty().withMessage('Subcategory name is required').isLength({ max: 100 }).withMessage('Subcategory name must not exceed 100 characters'),
      body('allocatedBudget').isFloat({ min: 0 }).withMessage('Allocated budget must be a positive number'),
      validate
    ],
    createSubcategory
  );

router.route('/subcategories/:subcategoryId')
  .put(
    protect,
    [
      param('subcategoryId').isMongoId().withMessage('Invalid Subcategory ID'),
      body('name').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Subcategory name must not exceed 100 characters'),
      body('allocatedBudget').optional().isFloat({ min: 0 }).withMessage('Allocated budget must be a positive number'),
      validate
    ],
    updateSubcategory
  )
  .delete(
    protect,
    [
      param('subcategoryId').isMongoId().withMessage('Invalid Subcategory ID'),
      validate
    ],
    deleteSubcategory
  );

router.route('/:id')
  .put(
    protect,
    [
      param('id').isMongoId().withMessage('Invalid ID'),
      body('name').trim().notEmpty().withMessage('Category name is required').isLength({ max: 100 }).withMessage('Category name must not exceed 100 characters'),
      validate
    ],
    updateCategory
  )
  .delete(
    protect,
    [
      param('id').isMongoId().withMessage('Invalid ID'),
      validate
    ],
    deleteCategory
  );

module.exports = router;
