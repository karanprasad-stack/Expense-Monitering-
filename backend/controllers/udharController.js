const Person = require('../models/Person');
const UdharTransaction = require('../models/UdharTransaction');

// In-memory idempotency cache for deduplication (TTL 5 minutes)
const udharIdempotencyCache = new Map();
const udharInFlightRequests = new Map();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

// Clean up expired idempotency keys periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of udharIdempotencyCache.entries()) {
    if (now - entry.timestamp > IDEMPOTENCY_TTL_MS) {
      udharIdempotencyCache.delete(key);
    }
  }
}, 60 * 1000);

/**
 * Helper to compute balance and stats for people
 */
const computePeopleStats = (people, transactions) => {
  // Map transactions by personId
  const txByPerson = new Map();
  for (const tx of transactions) {
    const pId = tx.personId.toString();
    if (!txByPerson.has(pId)) {
      txByPerson.set(pId, []);
    }
    txByPerson.get(pId).push(tx);
  }

  let totalToReceive = 0;
  let totalToPay = 0;

  const peopleWithStats = people.map(p => {
    const pId = p._id.toString();
    const pTxList = txByPerson.get(pId) || [];

    let totalGiven = 0;
    let totalReceived = 0;
    let lastTransactionDate = null;

    for (const tx of pTxList) {
      if (tx.type === 'GAVE') {
        totalGiven += tx.amount;
      } else if (tx.type === 'RECEIVED') {
        totalReceived += tx.amount;
      }
      if (!lastTransactionDate || new Date(tx.date) > new Date(lastTransactionDate)) {
        lastTransactionDate = tx.date;
      }
    }

    const netBalance = totalGiven - totalReceived;
    let status = 'SETTLED';
    if (netBalance > 0) {
      status = 'THEY_OWE_YOU';
      totalToReceive += netBalance;
    } else if (netBalance < 0) {
      status = 'YOU_OWE_THEM';
      totalToPay += Math.abs(netBalance);
    }

    return {
      _id: p._id,
      name: p.name,
      phone: p.phone,
      note: p.note,
      createdAt: p.createdAt,
      totalGiven,
      totalReceived,
      netBalance,
      status,
      transactionCount: pTxList.length,
      lastTransactionDate
    };
  });

  // Sort people: active non-settled first (largest balances), then settled
  peopleWithStats.sort((a, b) => {
    if (a.status !== 'SETTLED' && b.status === 'SETTLED') return -1;
    if (a.status === 'SETTLED' && b.status !== 'SETTLED') return 1;
    return Math.abs(b.netBalance) - Math.abs(a.netBalance);
  });

  return {
    overview: {
      totalToReceive,
      totalToPay,
      netBalance: totalToReceive - totalToPay,
      peopleCount: people.length
    },
    people: peopleWithStats
  };
};

// @desc    Get overall Lending & Borrowing overview and people list
// @route   GET /api/udhar/overview
// @access  Private
const getUdharOverview = async (req, res) => {
  try {
    const people = await Person.find({ userId: req.user._id, isArchived: false }).sort({ name: 1 });
    const transactions = await UdharTransaction.find({ userId: req.user._id });

    const result = computePeopleStats(people, transactions);
    res.json(result);
  } catch (error) {
    console.error('Get Udhar overview error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Get people list with optional search and filter
// @route   GET /api/udhar/people
// @access  Private
const getPeople = async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = { userId: req.user._id, isArchived: false };

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { phone: searchRegex }];
    }

    const people = await Person.find(query).sort({ name: 1 });
    const transactions = await UdharTransaction.find({ userId: req.user._id });

    const result = computePeopleStats(people, transactions);

    let filteredPeople = result.people;
    if (status && status !== 'ALL') {
      if (status === 'THEY_OWE_ME') {
        filteredPeople = filteredPeople.filter(p => p.status === 'THEY_OWE_YOU');
      } else if (status === 'I_OWE_THEM') {
        filteredPeople = filteredPeople.filter(p => p.status === 'YOU_OWE_THEM');
      } else if (status === 'SETTLED') {
        filteredPeople = filteredPeople.filter(p => p.status === 'SETTLED');
      }
    }

    res.json({
      overview: result.overview,
      people: filteredPeople
    });
  } catch (error) {
    console.error('Get people error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Create a new Person
// @route   POST /api/udhar/people
// @access  Private
const createPerson = async (req, res) => {
  try {
    const { name, phone, note } = req.body;

    const trimmedName = name.trim();
    const existing = await Person.findOne({
      userId: req.user._id,
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      isArchived: false
    });

    if (existing) {
      return res.status(400).json({ message: `A person named "${trimmedName}" already exists.` });
    }

    const person = await Person.create({
      userId: req.user._id,
      name: trimmedName,
      phone: phone ? phone.trim() : '',
      note: note ? note.trim() : ''
    });

    res.status(201).json({
      _id: person._id,
      name: person.name,
      phone: person.phone,
      note: person.note,
      createdAt: person.createdAt,
      totalGiven: 0,
      totalReceived: 0,
      netBalance: 0,
      status: 'SETTLED',
      transactionCount: 0,
      lastTransactionDate: null
    });
  } catch (error) {
    console.error('Create person error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Update a Person
// @route   PUT /api/udhar/people/:id
// @access  Private
const updatePerson = async (req, res) => {
  try {
    const { name, phone, note } = req.body;
    const person = await Person.findOne({ _id: req.params.id, userId: req.user._id });

    if (!person) {
      return res.status(404).json({ message: 'Person not found' });
    }

    if (name && name.trim()) {
      const trimmedName = name.trim();
      const existing = await Person.findOne({
        userId: req.user._id,
        _id: { $ne: person._id },
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
        isArchived: false
      });
      if (existing) {
        return res.status(400).json({ message: `Another person named "${trimmedName}" already exists.` });
      }
      person.name = trimmedName;
    }

    if (phone !== undefined) person.phone = phone ? phone.trim() : '';
    if (note !== undefined) person.note = note ? note.trim() : '';

    await person.save();

    res.json({
      message: 'Person updated successfully',
      person: {
        _id: person._id,
        name: person.name,
        phone: person.phone,
        note: person.note
      }
    });
  } catch (error) {
    console.error('Update person error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Delete a Person and cascade their transactions
// @route   DELETE /api/udhar/people/:id
// @access  Private
const deletePerson = async (req, res) => {
  try {
    const person = await Person.findOne({ _id: req.params.id, userId: req.user._id });
    if (!person) {
      return res.status(404).json({ message: 'Person not found' });
    }

    // Delete associated transactions
    await UdharTransaction.deleteMany({ userId: req.user._id, personId: person._id });
    await Person.findByIdAndDelete(person._id);

    res.json({ message: `Person "${person.name}" and all associated records deleted successfully` });
  } catch (error) {
    console.error('Delete person error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Get detailed chronological transaction history for a person
// @route   GET /api/udhar/people/:id/transactions
// @access  Private
const getPersonHistory = async (req, res) => {
  try {
    const person = await Person.findOne({ _id: req.params.id, userId: req.user._id });
    if (!person) {
      return res.status(404).json({ message: 'Person not found' });
    }

    // Fetch transactions in ascending order to compute chronological running balances
    const transactionsAsc = await UdharTransaction.find({
      userId: req.user._id,
      personId: person._id
    }).sort({ date: 1, createdAt: 1 });

    let runningBalance = 0;
    let totalGiven = 0;
    let totalReceived = 0;

    const historyWithRunningBalances = transactionsAsc.map(tx => {
      if (tx.type === 'GAVE') {
        runningBalance += tx.amount;
        totalGiven += tx.amount;
      } else {
        runningBalance -= tx.amount;
        totalReceived += tx.amount;
      }

      return {
        _id: tx._id,
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        description: tx.description,
        createdAt: tx.createdAt,
        runningBalance,
        balanceStatus: runningBalance > 0 ? 'THEY_OWE_YOU' : runningBalance < 0 ? 'YOU_OWE_THEM' : 'SETTLED'
      };
    });

    // Reverse to show newest first for display
    const newestFirst = [...historyWithRunningBalances].reverse();

    const netBalance = totalGiven - totalReceived;
    let status = 'SETTLED';
    if (netBalance > 0) status = 'THEY_OWE_YOU';
    else if (netBalance < 0) status = 'YOU_OWE_THEM';

    res.json({
      person: {
        _id: person._id,
        name: person.name,
        phone: person.phone,
        note: person.note,
        createdAt: person.createdAt,
        totalGiven,
        totalReceived,
        netBalance,
        status,
        transactionCount: newestFirst.length
      },
      transactions: newestFirst
    });
  } catch (error) {
    console.error('Get person history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Create an Udhar transaction (idempotent with double-submit guard)
// @route   POST /api/udhar/transactions
// @access  Private
const createUdharTransaction = async (req, res) => {
  const { personId, type, amount, date, description } = req.body;
  const idempotencyKey = req.headers['x-idempotency-key'] || req.body.idempotencyKey;
  const normalizedDesc = description ? description.trim() : '';
  const concurrencyKey = idempotencyKey || `${req.user._id}-${personId}-${type}-${Number(amount)}-${normalizedDesc}`;

  // 1. Check in-flight concurrent requests
  if (udharInFlightRequests.has(concurrencyKey)) {
    try {
      const existingResult = await udharInFlightRequests.get(concurrencyKey);
      return res.status(200).json({ ...existingResult, isDuplicate: true });
    } catch (err) {
      // Proceed if failed
    }
  }

  // 2. Check idempotency cache
  if (idempotencyKey && udharIdempotencyCache.has(idempotencyKey)) {
    const cached = udharIdempotencyCache.get(idempotencyKey);
    return res.status(200).json({ ...cached.data, isDuplicate: true });
  }

  // Synchronously register in-flight promise before any async await
  let resolveInFlight, rejectInFlight;
  const inFlightPromise = new Promise((resolve, reject) => {
    resolveInFlight = resolve;
    rejectInFlight = reject;
  });
  udharInFlightRequests.set(concurrencyKey, inFlightPromise);

  try {
    // 3. Rapid duplicate submission check (within last 3 seconds)
    const threeSecondsAgo = new Date(Date.now() - 3000);
    const existingDuplicate = await UdharTransaction.findOne({
      userId: req.user._id,
      personId,
      type,
      amount: Number(amount),
      description: normalizedDesc,
      createdAt: { $gte: threeSecondsAgo }
    });

    if (existingDuplicate) {
      const dupResponse = { transaction: existingDuplicate, isDuplicate: true };
      if (idempotencyKey) {
        udharIdempotencyCache.set(idempotencyKey, { timestamp: Date.now(), data: dupResponse });
      }
      udharInFlightRequests.delete(concurrencyKey);
      if (resolveInFlight) resolveInFlight(dupResponse);
      return res.status(200).json(dupResponse);
    }

    // 4. Verify person exists and belongs to user
    const person = await Person.findOne({ _id: personId, userId: req.user._id });
    if (!person) {
      udharInFlightRequests.delete(concurrencyKey);
      if (rejectInFlight) rejectInFlight(new Error('Person not found'));
      return res.status(404).json({ message: 'Person not found' });
    }

    // 5. Create transaction
    const txDate = date ? new Date(date) : new Date();
    const transaction = await UdharTransaction.create({
      userId: req.user._id,
      personId,
      type,
      amount: Number(amount),
      date: txDate,
      description: normalizedDesc
    });

    const responsePayload = { transaction, isDuplicate: false };

    if (idempotencyKey) {
      udharIdempotencyCache.set(idempotencyKey, { timestamp: Date.now(), data: responsePayload });
    }

    udharInFlightRequests.delete(concurrencyKey);
    if (resolveInFlight) resolveInFlight(responsePayload);

    return res.status(201).json(responsePayload);
  } catch (error) {
    udharInFlightRequests.delete(concurrencyKey);
    if (rejectInFlight) rejectInFlight(error);
    console.error('Create Udhar transaction error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Update an Udhar transaction
// @route   PUT /api/udhar/transactions/:id
// @access  Private
const updateUdharTransaction = async (req, res) => {
  try {
    const { type, amount, date, description, personId } = req.body;

    const transaction = await UdharTransaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (personId) {
      const person = await Person.findOne({ _id: personId, userId: req.user._id });
      if (!person) {
        return res.status(404).json({ message: 'Target person not found' });
      }
      transaction.personId = personId;
    }

    if (type) transaction.type = type;
    if (amount !== undefined) transaction.amount = Number(amount);
    if (date) transaction.date = new Date(date);
    if (description !== undefined) transaction.description = description.trim();

    await transaction.save();

    res.json({
      message: 'Transaction updated successfully',
      transaction
    });
  } catch (error) {
    console.error('Update Udhar transaction error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Delete an Udhar transaction
// @route   DELETE /api/udhar/transactions/:id
// @access  Private
const deleteUdharTransaction = async (req, res) => {
  try {
    const transaction = await UdharTransaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully', transactionId: req.params.id });
  } catch (error) {
    console.error('Delete Udhar transaction error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getUdharOverview,
  getPeople,
  createPerson,
  updatePerson,
  deletePerson,
  getPersonHistory,
  createUdharTransaction,
  updateUdharTransaction,
  deleteUdharTransaction
};
