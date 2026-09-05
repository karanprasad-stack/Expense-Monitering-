const Expense = require('../models/Expense');
const Subcategory = require('../models/Subcategory');

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

module.exports = {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense
};

