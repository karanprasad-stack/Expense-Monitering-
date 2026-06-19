const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const Expense = require('../models/Expense');

// @desc    Get dashboard summary
// @route   GET /api/dashboard
// @access  Private
const getDashboardSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Get budget
    const budget = await Budget.findOne({
      userId: req.user._id,
      month: Number(month),
      year: Number(year)
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found for this month' });
    }

    // Get categories & subcategories for this budget
    const categories = await Category.find({ budgetId: budget._id });
    const categoryIds = categories.map(c => c._id);
    
    const subcategories = await Subcategory.find({ categoryId: { $in: categoryIds } });
    
    const expenses = await Expense.find({
      userId: req.user._id,
      categoryId: { $in: categoryIds }
    }).sort({ date: -1 });

    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const savings = budget.totalBudget - totalSpent;

    // Overspent subcategories list and total overspent calculation
    let totalOverspent = 0;
    const overspentSubcategories = subcategories
      .filter(sub => sub.spentAmount > sub.allocatedBudget)
      .map(sub => {
        const over = sub.spentAmount - sub.allocatedBudget;
        totalOverspent += over;
        const parentCat = sub.categoryId && categories.find(c => c._id.toString() === sub.categoryId.toString());
        return {
          _id: sub._id,
          name: sub.name,
          categoryName: parentCat ? parentCat.name : 'Unknown',
          allocated: sub.allocatedBudget,
          spent: sub.spentAmount,
          over
        };
      });

    // Category comparison: Allocated vs Spent side-by-side
    const categoryComparison = categories.map(cat => {
      const subs = subcategories.filter(sub => sub.categoryId && sub.categoryId.toString() === cat._id.toString());
      const allocated = subs.reduce((acc, curr) => acc + curr.allocatedBudget, 0);
      const catExpenses = expenses.filter(exp => exp.categoryId && exp.categoryId.toString() === cat._id.toString());
      const spent = catExpenses.reduce((acc, curr) => acc + curr.amount, 0);
      return {
        name: cat.name,
        allocated,
        spent
      };
    });

    // Subcategory spending breakdown for a pie chart
    const subcategorySpending = subcategories
      .map(sub => ({
        name: sub.name,
        value: sub.spentAmount
      }))
      .filter(item => item.value > 0);

    // Recent 5 expenses
    const recentExpenses = await Expense.find({ userId: req.user._id })
      .sort({ date: -1 })
      .limit(5);

    // Enhance recent expenses with category/subcategory names
    const enhancedRecentExpenses = recentExpenses.map(exp => {
      const cat = exp.categoryId && categories.find(c => c._id.toString() === exp.categoryId.toString());
      const sub = exp.subcategoryId && subcategories.find(s => s._id.toString() === exp.subcategoryId.toString());
      return {
        _id: exp._id,
        description: exp.description,
        amount: exp.amount,
        date: exp.date,
        categoryName: cat ? cat.name : 'Unknown',
        subcategoryName: sub ? sub.name : 'Unknown'
      };
    });

    // Enhance all expenses with category/subcategory names
    const enhancedAllExpenses = expenses.map(exp => {
      const cat = exp.categoryId && categories.find(c => c._id.toString() === exp.categoryId.toString());
      const sub = exp.subcategoryId && subcategories.find(s => s._id.toString() === exp.subcategoryId.toString());
      return {
        _id: exp._id,
        description: exp.description,
        amount: exp.amount,
        date: exp.date,
        categoryName: cat ? cat.name : 'Unknown',
        subcategoryName: sub ? sub.name : 'Unknown'
      };
    });

    res.json({
      totalBudget: budget.totalBudget,
      allocatedAmount: budget.allocatedAmount,
      remainingBalance: budget.totalBudget - budget.allocatedAmount,
      totalSpent,
      totalOverspent,
      savings,
      overspentSubcategories,
      categoryComparison,
      subcategorySpending,
      recentExpenses: enhancedRecentExpenses,
      allExpenses: enhancedAllExpenses
    });

  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getDashboardSummary };
