const Expense = require('../models/Expense');
const Subcategory = require('../models/Subcategory');

// @desc    Get expenses
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user._id }).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Create an expense
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res) => {
  try {
    const { amount, description, date, categoryId, subcategoryId, paymentMethod, isRecurring } = req.body;
    
    const subcategory = await Subcategory.findById(subcategoryId);
    if (!subcategory || subcategory.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    const expense = await Expense.create({
      userId: req.user._id,
      amount,
      description: description ? description.trim() : 'General',
      date: date || Date.now(),
      categoryId,
      subcategoryId,
      paymentMethod,
      isRecurring
    });

    // Update subcategory spentAmount
    subcategory.spentAmount += Number(amount);
    await subcategory.save();

    // Check for overspending warning
    let warning = null;
    if (subcategory.spentAmount > subcategory.allocatedBudget) {
      warning = `Over Budget by ₹${subcategory.spentAmount - subcategory.allocatedBudget}`;
    }

    res.status(201).json({ expense, warning });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getExpenses, createExpense };
