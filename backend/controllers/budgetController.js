const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');

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

// @desc    Get all budgets for user
// @route   GET /api/budgets/all
// @access  Private
const getAllBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user._id })
      .sort({ year: -1, month: -1 })
      .select('month year totalBudget allocatedAmount remainingAmount')
      .lean();

    res.json(budgets);
  } catch (error) {
    console.error('Get all budgets error:', error);
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

// @desc    Copy budget and categories structure from one month to another
// @route   POST /api/budgets/copy
// @access  Private
const copyBudget = async (req, res) => {
  try {
    const { sourceMonth, sourceYear, targetMonth, targetYear, mode = 'replace' } = req.body;

    const sMonth = Number(sourceMonth);
    const sYear = Number(sourceYear);
    const tMonth = Number(targetMonth);
    const tYear = Number(targetYear);

    if (!sMonth || !sYear || !tMonth || !tYear) {
      return res.status(400).json({ message: 'Source and target month and year are required.' });
    }

    if (sMonth === tMonth && sYear === tYear) {
      return res.status(400).json({ message: 'Source and target month cannot be the same.' });
    }

    // Find source budget
    const sourceBudget = await Budget.findOne({
      userId: req.user._id,
      month: sMonth,
      year: sYear
    });

    if (!sourceBudget) {
      return res.status(404).json({ message: `No budget found for ${sMonth}/${sYear} to copy from.` });
    }

    // Find all categories & subcategories from source
    const sourceCategories = await Category.find({
      userId: req.user._id,
      budgetId: sourceBudget._id
    }).lean();

    for (let cat of sourceCategories) {
      cat.subcategories = await Subcategory.find({ categoryId: cat._id }).lean();
    }

    // Find or create target budget
    let targetBudget = await Budget.findOne({
      userId: req.user._id,
      month: tMonth,
      year: tYear
    });

    if (mode === 'replace') {
      if (targetBudget) {
        // Delete all existing categories and subcategories for the target budget
        const targetCategories = await Category.find({
          userId: req.user._id,
          budgetId: targetBudget._id
        });

        for (let cat of targetCategories) {
          await Subcategory.deleteMany({ categoryId: cat._id });
        }
        await Category.deleteMany({ userId: req.user._id, budgetId: targetBudget._id });

        targetBudget.totalBudget = sourceBudget.totalBudget;
        targetBudget.allocatedAmount = 0;
        targetBudget.remainingAmount = sourceBudget.totalBudget;
        await targetBudget.save();
      } else {
        targetBudget = await Budget.create({
          userId: req.user._id,
          month: tMonth,
          year: tYear,
          totalBudget: sourceBudget.totalBudget,
          allocatedAmount: 0,
          remainingAmount: sourceBudget.totalBudget
        });
      }

      // Copy categories and subcategories
      for (let sCat of sourceCategories) {
        const newCat = await Category.create({
          userId: req.user._id,
          name: sCat.name,
          budgetId: targetBudget._id
        });

        if (sCat.subcategories && sCat.subcategories.length > 0) {
          for (let sSub of sCat.subcategories) {
            await Subcategory.create({
              userId: req.user._id,
              name: sSub.name,
              categoryId: newCat._id,
              allocatedBudget: Number(sSub.allocatedBudget) || 0,
              spentAmount: 0
            });
          }
        }
      }
    } else if (mode === 'merge') {
      // Merge mode: Preserve existing items in destination, only add missing categories / subcategories
      if (!targetBudget) {
        targetBudget = await Budget.create({
          userId: req.user._id,
          month: tMonth,
          year: tYear,
          totalBudget: sourceBudget.totalBudget,
          allocatedAmount: 0,
          remainingAmount: sourceBudget.totalBudget
        });
      }

      for (let sCat of sourceCategories) {
        let targetCat = await Category.findOne({
          userId: req.user._id,
          budgetId: targetBudget._id,
          name: sCat.name
        });

        if (!targetCat) {
          targetCat = await Category.create({
            userId: req.user._id,
            name: sCat.name,
            budgetId: targetBudget._id
          });
        }

        if (sCat.subcategories && sCat.subcategories.length > 0) {
          for (let sSub of sCat.subcategories) {
            const existingSub = await Subcategory.findOne({
              categoryId: targetCat._id,
              name: sSub.name
            });

            if (!existingSub) {
              await Subcategory.create({
                userId: req.user._id,
                name: sSub.name,
                categoryId: targetCat._id,
                allocatedBudget: Number(sSub.allocatedBudget) || 0,
                spentAmount: 0
              });
            }
          }
        }
      }
    }

    // Recalculate target budget allocations
    const finalCategories = await Category.find({
      userId: req.user._id,
      budgetId: targetBudget._id
    });
    let totalAllocated = 0;
    for (let cat of finalCategories) {
      const subs = await Subcategory.find({ categoryId: cat._id });
      totalAllocated += subs.reduce((sum, s) => sum + (s.allocatedBudget || 0), 0);
    }

    targetBudget.allocatedAmount = totalAllocated;
    if (targetBudget.totalBudget < totalAllocated) {
      targetBudget.totalBudget = totalAllocated;
    }
    targetBudget.remainingAmount = targetBudget.totalBudget - totalAllocated;
    await targetBudget.save();

    res.json({
      message: 'Budget copied successfully',
      budget: targetBudget
    });
  } catch (error) {
    console.error('Copy budget error:', error);
    res.status(500).json({ message: 'Internal server error while copying budget' });
  }
};

module.exports = { getBudget, getAllBudgets, createOrUpdateBudget, copyBudget };
