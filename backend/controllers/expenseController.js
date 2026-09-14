const Expense = require('../models/Expense');
const Subcategory = require('../models/Subcategory');
const Category = require('../models/Category');

// In-memory idempotency cache for deduplication (TTL 5 minutes)
const idempotencyCache = new Map();
const inFlightRequests = new Map();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

// Clean up expired idempotency keys periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache.entries()) {
    if (now - entry.timestamp > IDEMPOTENCY_TTL_MS) {
      idempotencyCache.delete(key);
    }
  }
}, 60 * 1000);

// @desc    Get expenses (supports optional filters: subcategoryId, categoryId, month, year)
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
  try {
    const { subcategoryId, categoryId, month, year } = req.query;
    const filter = { userId: req.user._id };

    if (subcategoryId) {
      filter.subcategoryId = subcategoryId;
    }
    if (categoryId) {
      filter.categoryId = categoryId;
    }
    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    const expenses = await Expense.find(filter)
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name allocatedBudget spentAmount')
      .sort({ date: -1, createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Create an expense (idempotent with double-submit guard)
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res) => {
  const { amount, description, date, categoryId, subcategoryId, paymentMethod, isRecurring } = req.body;
  const idempotencyKey = req.headers['x-idempotency-key'] || req.body.idempotencyKey;
  const normalizedDesc = description ? description.trim() : 'General';
  const concurrencyKey = idempotencyKey || `${req.user._id}-${subcategoryId}-${Number(amount)}-${normalizedDesc}`;

  // 1. Check if identical request is currently in-flight
  if (inFlightRequests.has(concurrencyKey)) {
    try {
      const existingResult = await inFlightRequests.get(concurrencyKey);
      return res.status(200).json({ ...existingResult, isDuplicate: true });
    } catch (err) {
      // If previous failed, proceed with current
    }
  }

  // 2. Check idempotency cache
  if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
    const cached = idempotencyCache.get(idempotencyKey);
    return res.status(200).json({ ...cached.data, isDuplicate: true });
  }

  // Create deferred promise for in-flight tracking synchronously BEFORE any async await
  let resolveInFlight, rejectInFlight;
  const inFlightPromise = new Promise((resolve, reject) => {
    resolveInFlight = resolve;
    rejectInFlight = reject;
  });
  inFlightRequests.set(concurrencyKey, inFlightPromise);

  try {
    // 3. Rapid duplicate submission check (within last 3 seconds for same user & exact parameters)
    const threeSecondsAgo = new Date(Date.now() - 3000);
    const existingDuplicate = await Expense.findOne({
      userId: req.user._id,
      amount: Number(amount),
      categoryId,
      subcategoryId,
      description: normalizedDesc,
      createdAt: { $gte: threeSecondsAgo }
    }).populate('categoryId', 'name').populate('subcategoryId', 'name');

    if (existingDuplicate) {
      const duplicateResponse = {
        expense: existingDuplicate,
        warning: null,
        isDuplicate: true
      };
      if (idempotencyKey) {
        idempotencyCache.set(idempotencyKey, { timestamp: Date.now(), data: duplicateResponse });
      }
      inFlightRequests.delete(concurrencyKey);
      if (resolveInFlight) resolveInFlight(duplicateResponse);
      return res.status(200).json(duplicateResponse);
    }

    // 4. Verify subcategory exists and belongs to user
    const subcategory = await Subcategory.findById(subcategoryId);
    if (!subcategory || subcategory.userId.toString() !== req.user._id.toString()) {
      inFlightRequests.delete(concurrencyKey);
      if (rejectInFlight) rejectInFlight(new Error('Subcategory not found'));
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    // 5. Create the expense record
    const expenseDate = date ? new Date(date) : new Date();
    const expense = await Expense.create({
      userId: req.user._id,
      amount: Number(amount),
      description: normalizedDesc,
      date: expenseDate,
      categoryId,
      subcategoryId,
      paymentMethod,
      isRecurring: !!isRecurring
    });

    // 6. Update subcategory spentAmount
    subcategory.spentAmount = (subcategory.spentAmount || 0) + Number(amount);
    await subcategory.save();

    // 7. Check for overspending warning
    let warning = null;
    if (subcategory.spentAmount > subcategory.allocatedBudget) {
      warning = `Over Budget by ₹${subcategory.spentAmount - subcategory.allocatedBudget}`;
    }

    const populatedExpense = await Expense.findById(expense._id)
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name allocatedBudget spentAmount');

    const responsePayload = { expense: populatedExpense, warning, isDuplicate: false };

    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, { timestamp: Date.now(), data: responsePayload });
    }

    inFlightRequests.delete(concurrencyKey);
    if (resolveInFlight) resolveInFlight(responsePayload);

    return res.status(201).json(responsePayload);
  } catch (error) {
    inFlightRequests.delete(concurrencyKey);
    if (rejectInFlight) rejectInFlight(error);
    console.error('Create expense error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Update an expense
// @route   PUT /api/expenses/:id
// @access  Private
const updateExpense = async (req, res) => {
  try {
    const { amount, description, date, categoryId, subcategoryId, paymentMethod, isRecurring } = req.body;

    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const oldAmount = expense.amount;
    const oldSubcategoryId = expense.subcategoryId.toString();
    const newSubcategoryId = subcategoryId || oldSubcategoryId;
    const newAmount = amount !== undefined ? Number(amount) : oldAmount;

    // Check if target subcategory exists
    const targetSubcategory = await Subcategory.findById(newSubcategoryId);
    if (!targetSubcategory || targetSubcategory.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Target subcategory not found' });
    }

    // Adjust subcategory spentAmount
    if (oldSubcategoryId === newSubcategoryId) {
      const delta = newAmount - oldAmount;
      if (delta !== 0) {
        targetSubcategory.spentAmount = Math.max(0, (targetSubcategory.spentAmount || 0) + delta);
        await targetSubcategory.save();
      }
    } else {
      // Subcategory changed: decrement old subcategory, increment new subcategory
      const oldSubcategory = await Subcategory.findById(oldSubcategoryId);
      if (oldSubcategory) {
        oldSubcategory.spentAmount = Math.max(0, (oldSubcategory.spentAmount || 0) - oldAmount);
        await oldSubcategory.save();
      }

      targetSubcategory.spentAmount = (targetSubcategory.spentAmount || 0) + newAmount;
      await targetSubcategory.save();
    }

    // Update expense fields
    if (amount !== undefined) expense.amount = newAmount;
    if (description !== undefined) expense.description = description ? description.trim() : 'General';
    if (date !== undefined) expense.date = new Date(date);
    if (categoryId !== undefined) expense.categoryId = categoryId;
    if (subcategoryId !== undefined) expense.subcategoryId = subcategoryId;
    if (paymentMethod !== undefined) expense.paymentMethod = paymentMethod;
    if (isRecurring !== undefined) expense.isRecurring = !!isRecurring;

    await expense.save();

    // Check warning on target subcategory
    let warning = null;
    if (targetSubcategory.spentAmount > targetSubcategory.allocatedBudget) {
      warning = `Over Budget by ₹${targetSubcategory.spentAmount - targetSubcategory.allocatedBudget}`;
    }

    const updatedExpense = await Expense.findById(expense._id)
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name allocatedBudget spentAmount');

    res.json({ expense: updatedExpense, warning });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Decrement subcategory spentAmount
    const subcategory = await Subcategory.findById(expense.subcategoryId);
    if (subcategory) {
      subcategory.spentAmount = Math.max(0, (subcategory.spentAmount || 0) - expense.amount);
      await subcategory.save();
    }

    await Expense.findByIdAndDelete(expense._id);
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Helper to escape regex special characters
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Analyze spending across historical months by subcategory/category/description
// @route   GET /api/expenses/analysis
// @access  Private
const getSpendingAnalysis = async (req, res) => {
  try {
    const { q, range, startDate, endDate } = req.query;
    const userId = req.user._id;

    // 1. Determine Date Range Filter
    let dateFilter = null;
    const now = new Date();

    if (range === 'last-3-months') {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      dateFilter = { $gte: start };
    } else if (range === 'last-6-months') {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      dateFilter = { $gte: start };
    } else if (range === 'last-12-months') {
      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      dateFilter = { $gte: start };
    } else if (range === 'this-year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
    } else if (range === 'last-year') {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
    } else if (range === 'custom' && (startDate || endDate)) {
      dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
    }

    // 2. Suggestions if query `q` is not provided or empty
    const trimmedQ = (q || '').trim();

    if (!trimmedQ) {
      const userSubcategories = await Subcategory.find({ userId }).select('name').limit(20).lean();
      const distinctSubcatNames = [...new Set(userSubcategories.map(s => s.name.trim()).filter(Boolean))];

      const recentExpenses = await Expense.find({ userId })
        .sort({ date: -1 })
        .limit(40)
        .select('description')
        .lean();
      const distinctDescriptions = [...new Set(
        recentExpenses
          .map(e => e.description?.trim())
          .filter(d => d && d.toLowerCase() !== 'general')
      )];

      const suggestions = [...new Set([...distinctSubcatNames, ...distinctDescriptions])].slice(0, 12);

      return res.json({
        query: '',
        range: range || 'last-6-months',
        suggestions,
        overallTotal: 0,
        overallCount: 0,
        monthsTracked: 0,
        averageMonthlySpent: 0,
        months: []
      });
    }

    // 3. Search Matching Categories and Subcategories
    const escaped = escapeRegex(trimmedQ);
    const searchRegex = new RegExp(escaped, 'i');

    const [matchingCategories, matchingSubcategories] = await Promise.all([
      Category.find({ userId, name: searchRegex }).select('_id name').lean(),
      Subcategory.find({ userId, name: searchRegex }).select('_id name categoryId').lean()
    ]);

    const matchingCatIds = matchingCategories.map(c => c._id);
    const matchingSubcatIds = matchingSubcategories.map(s => s._id);

    // Build matching $or conditions
    const orConditions = [
      { description: searchRegex }
    ];
    if (matchingSubcatIds.length > 0) {
      orConditions.push({ subcategoryId: { $in: matchingSubcatIds } });
    }
    if (matchingCatIds.length > 0) {
      orConditions.push({ categoryId: { $in: matchingCatIds } });
    }

    const expenseFilter = {
      userId,
      $or: orConditions
    };

    if (dateFilter) {
      expenseFilter.date = dateFilter;
    }

    // 4. Fetch matching expenses
    const expenses = await Expense.find(expenseFilter)
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // 5. Annotate each expense with match origin & priority
    const lowerQ = trimmedQ.toLowerCase();
    const annotatedExpenses = expenses.map(exp => {
      const subName = exp.subcategoryId?.name || '';
      const catName = exp.categoryId?.name || '';
      const desc = exp.description || '';

      const isSubMatch = subName.toLowerCase().includes(lowerQ);
      const isDescMatch = desc.toLowerCase().includes(lowerQ);
      const isCatMatch = catName.toLowerCase().includes(lowerQ);

      let matchType = 'description';
      if (isSubMatch) matchType = 'subcategory';
      else if (isCatMatch) matchType = 'category';

      return {
        ...exp,
        matchType,
        subName,
        catName
      };
    });

    // 6. Group by Month (Chronological Newest -> Oldest)
    const monthGroupsMap = new Map();

    for (const exp of annotatedExpenses) {
      const d = new Date(exp.date);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;

      if (!monthGroupsMap.has(monthKey)) {
        const monthLabel = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        monthGroupsMap.set(monthKey, {
          monthKey,
          year,
          month,
          monthLabel,
          total: 0,
          count: 0,
          transactions: []
        });
      }

      const group = monthGroupsMap.get(monthKey);
      group.total += exp.amount || 0;
      group.count += 1;
      group.transactions.push(exp);
    }

    // Sort month groups descending by monthKey (e.g. 2026-09 before 2026-08)
    const months = Array.from(monthGroupsMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    // Sort transactions within each month descending by date
    for (const m of months) {
      m.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // 7. Calculate overall aggregates
    const overallTotal = annotatedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const overallCount = annotatedExpenses.length;
    const monthsTracked = months.length;
    const averageMonthlySpent = monthsTracked > 0 ? Math.round(overallTotal / monthsTracked) : 0;

    res.json({
      query: trimmedQ,
      range: range || 'last-6-months',
      overallTotal,
      overallCount,
      monthsTracked,
      averageMonthlySpent,
      months
    });
  } catch (error) {
    console.error('Get spending analysis error:', error);
    res.status(500).json({ message: 'Internal server error while analyzing spending' });
  }
};

module.exports = {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getSpendingAnalysis
};


