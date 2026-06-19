const Budget = require('../models/Budget');

// @desc    Get current month budget
// @route   GET /api/budgets
// @access  Private
const getBudget = async (req, res) => {
  try {
    const { month, year } = req.query;

    const budget = await Budget.findOne({
      userId: req.user._id,
      month: Number(month),
      year: Number(year)
    });

    if (budget) {
      res.json(budget);
    } else {
      res.status(404).json({ message: 'Budget not found for this month' });
    }
  } catch (error) {
    console.error('Get budget error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Create or update budget
// @route   POST /api/budgets
// @access  Private
const createOrUpdateBudget = async (req, res) => {
  try {
    const { month, year, totalBudget } = req.body;

    let budget = await Budget.findOne({
      userId: req.user._id,
      month: Number(month),
      year: Number(year)
    });

    if (budget) {
      budget.totalBudget = totalBudget;
      await budget.save();
      res.json(budget);
    } else {
      budget = await Budget.create({
        userId: req.user._id,
        month,
        year,
        totalBudget
      });
      res.status(201).json(budget);
    }
  } catch (error) {
    console.error('Create/Update budget error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getBudget, createOrUpdateBudget };
