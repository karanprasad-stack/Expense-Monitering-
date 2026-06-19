const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const Budget = require('../models/Budget');

// @desc    Get all categories and subcategories for a budget
// @route   GET /api/categories?budgetId=...
// @access  Private
const getCategories = async (req, res) => {
  try {
    const { budgetId } = req.query;
    if (!budgetId) return res.status(400).json({ message: 'Budget ID required' });

    const categories = await Category.find({ userId: req.user._id, budgetId }).lean();
    
    // Get subcategories
    for (let cat of categories) {
      cat.subcategories = await Subcategory.find({ categoryId: cat._id }).lean();
    }
    
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private
const createCategory = async (req, res) => {
  try {
    const { name, budgetId } = req.body;
    const category = await Category.create({ userId: req.user._id, name, budgetId });
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Create a subcategory
// @route   POST /api/categories/:categoryId/subcategories
// @access  Private
const createSubcategory = async (req, res) => {
  try {
    const { name, allocatedBudget } = req.body;
    const categoryId = req.params.categoryId;
    
    const category = await Category.findById(categoryId);
    if (!category || category.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const subcategory = await Subcategory.create({
      userId: req.user._id,
      name,
      categoryId,
      allocatedBudget
    });

    // Update parent budget allocated amount
    const budget = await Budget.findById(category.budgetId);
    budget.allocatedAmount += Number(allocatedBudget);
    await budget.save();

    res.status(201).json(subcategory);
  } catch (error) {
    console.error('Create subcategory error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private
const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category || category.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Category not found' });
    }
    category.name = name || category.name;
    await category.save();
    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private
const deleteCategory = async (req, res) => {
  const Expense = require('../models/Expense');
  try {
    const category = await Category.findById(req.params.id);
    if (!category || category.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const subcategories = await Subcategory.find({ categoryId: category._id });
    const totalAllocatedToSubtract = subcategories.reduce((sum, sub) => sum + sub.allocatedBudget, 0);

    // Delete subcategories
    await Subcategory.deleteMany({ categoryId: category._id });

    // Delete expenses under this category
    await Expense.deleteMany({ categoryId: category._id });

    // Update parent budget allocated amount
    const budget = await Budget.findById(category.budgetId);
    if (budget) {
      budget.allocatedAmount = Math.max(0, budget.allocatedAmount - totalAllocatedToSubtract);
      await budget.save();
    }

    await Category.findByIdAndDelete(category._id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Update a subcategory
// @route   PUT /api/categories/subcategories/:subcategoryId
// @access  Private
const updateSubcategory = async (req, res) => {
  try {
    const { name, allocatedBudget } = req.body;
    const subcategory = await Subcategory.findById(req.params.subcategoryId);
    if (!subcategory || subcategory.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    const category = await Category.findById(subcategory.categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Parent category not found' });
    }

    const oldAllocated = subcategory.allocatedBudget;
    subcategory.name = name || subcategory.name;

    if (allocatedBudget !== undefined) {
      subcategory.allocatedBudget = Number(allocatedBudget);
    }

    await subcategory.save();

    if (oldAllocated !== subcategory.allocatedBudget) {
      const budget = await Budget.findById(category.budgetId);
      if (budget) {
        budget.allocatedAmount = Math.max(0, budget.allocatedAmount - oldAllocated + subcategory.allocatedBudget);
        await budget.save();
      }
    }

    res.json(subcategory);
  } catch (error) {
    console.error('Update subcategory error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Delete a subcategory
// @route   DELETE /api/categories/subcategories/:subcategoryId
// @access  Private
const deleteSubcategory = async (req, res) => {
  const Expense = require('../models/Expense');
  try {
    const subcategory = await Subcategory.findById(req.params.subcategoryId);
    if (!subcategory || subcategory.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    const category = await Category.findById(subcategory.categoryId);

    // Delete subcategory expenses
    await Expense.deleteMany({ subcategoryId: subcategory._id });

    // Update parent budget
    if (category) {
      const budget = await Budget.findById(category.budgetId);
      if (budget) {
        budget.allocatedAmount = Math.max(0, budget.allocatedAmount - subcategory.allocatedBudget);
        await budget.save();
      }
    }

    await Subcategory.findByIdAndDelete(subcategory._id);
    res.json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    console.error('Delete subcategory error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getCategories,
  createCategory,
  createSubcategory,
  updateCategory,
  deleteCategory,
  updateSubcategory,
  deleteSubcategory
};
