import React, { useState, useEffect, useId } from 'react';
import {
  Handshake,
  UserPlus,
  PlusCircle,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Users,
  Pencil,
  Trash2,
  Calendar,
  Phone,
  FileText,
  Clock,
  Loader2,
  AlertTriangle,
  X,
  CheckCircle2,
  Receipt,
  ArrowLeft
} from 'lucide-react';
import api from '../utils/axios';

const LendingBorrowing = () => {
  const [overview, setOverview] = useState({
    totalToReceive: 0,
    totalToPay: 0,
    netBalance: 0,
    peopleCount: 0
  });
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Person Modals
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [personForm, setPersonForm] = useState({ name: '', phone: '', note: '' });
  const [isSavingPerson, setIsSavingPerson] = useState(false);

  // Transaction Modals
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [txForm, setTxForm] = useState({
    personId: '',
    type: 'GAVE', // 'GAVE' or 'RECEIVED'
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [isSavingTx, setIsSavingTx] = useState(false);

  // History View / Modal
  const [activePersonHistory, setActivePersonHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState({ person: null, transactions: [] });

  // Delete Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    type: null, // 'PERSON' or 'TRANSACTION'
    id: null,
    title: '',
    message: ''
  });

  // Alerts / Notifications
  const [alert, setAlert] = useState({ type: '', message: '' });

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert({ type: '', message: '' }), 4000);
  };

  // Fetch Overview and People
  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await api.get('/udhar/people', { params });
      setOverview(res.data.overview);
      setPeople(res.data.people);
    } catch (err) {
      console.error('Fetch Udhar data error:', err);
      showAlert('error', err.response?.data?.message || 'Failed to load Lending & Borrowing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Person History
  const fetchPersonHistory = async (personId) => {
    try {
      setHistoryLoading(true);
      const res = await api.get(`/udhar/people/${personId}/transactions`);
      setHistoryData(res.data);
      setActivePersonHistory(personId);
    } catch (err) {
      console.error('Fetch person history error:', err);
      showAlert('error', 'Failed to load transaction history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // --- Person Handlers ---
  const handleOpenAddPerson = () => {
    setEditingPerson(null);
    setPersonForm({ name: '', phone: '', note: '' });
    setIsAddPersonOpen(true);
  };

  const handleOpenEditPerson = (p, e) => {
    if (e) e.stopPropagation();
    setEditingPerson(p);
    setPersonForm({ name: p.name, phone: p.phone || '', note: p.note || '' });
    setIsAddPersonOpen(true);
  };

  const handleSavePerson = async (e) => {
    e.preventDefault();
    if (!personForm.name.trim()) {
      showAlert('error', 'Person name is required');
      return;
    }

    try {
      setIsSavingPerson(true);
      if (editingPerson) {
        await api.put(`/udhar/people/${editingPerson._id}`, personForm);
        showAlert('success', 'Person updated successfully');
      } else {
        await api.post('/udhar/people', personForm);
        showAlert('success', 'Person added successfully');
      }
      setIsAddPersonOpen(false);
      fetchData();
      if (activePersonHistory && editingPerson && activePersonHistory === editingPerson._id) {
        fetchPersonHistory(activePersonHistory);
      }
    } catch (err) {
      console.error('Save person error:', err);
      showAlert('error', err.response?.data?.message || 'Failed to save person');
    } finally {
      setIsSavingPerson(false);
    }
  };

  const handleDeletePersonClick = (p, e) => {
    if (e) e.stopPropagation();
    setDeleteConfirm({
      isOpen: true,
      type: 'PERSON',
      id: p._id,
      title: `Delete ${p.name}?`,
      message: `Are you sure you want to delete ${p.name}? All recorded Udhar transactions for this person will also be permanently deleted.`
    });
  };

  // --- Transaction Handlers ---
  const handleOpenAddTx = (personId = '', defaultType = 'GAVE', e) => {
    if (e) e.stopPropagation();
    setEditingTx(null);
    setTxForm({
      personId: personId || (people.length > 0 ? people[0]._id : ''),
      type: defaultType,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setIsAddTxOpen(true);
  };

  const handleOpenEditTx = (tx, e) => {
    if (e) e.stopPropagation();
    setEditingTx(tx);
    setTxForm({
      personId: activePersonHistory || tx.personId,
      type: tx.type,
      amount: tx.amount,
      date: new Date(tx.date).toISOString().split('T')[0],
      description: tx.description || ''
    });
    setIsAddTxOpen(true);
  };

  const handleSaveTx = async (e) => {
    e.preventDefault();
    if (!txForm.personId) {
      showAlert('error', 'Please select a person');
      return;
    }
    const numAmount = parseFloat(txForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showAlert('error', 'Please enter a valid amount greater than 0');
      return;
    }

    try {
      setIsSavingTx(true);
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `udhar-${Date.now()}-${Math.random()}`;

      if (editingTx) {
        await api.put(`/udhar/transactions/${editingTx._id}`, txForm);
        showAlert('success', 'Transaction updated successfully');
      } else {
        await api.post('/udhar/transactions', txForm, {
          headers: { 'X-Idempotency-Key': idempotencyKey }
        });
        showAlert('success', 'Transaction recorded successfully');
      }

      setIsAddTxOpen(false);
      fetchData();
      if (activePersonHistory) {
        fetchPersonHistory(activePersonHistory);
      }
    } catch (err) {
      console.error('Save transaction error:', err);
      showAlert('error', err.response?.data?.message || 'Failed to record transaction');
    } finally {
      setIsSavingTx(false);
    }
  };

  const handleDeleteTxClick = (txId, e) => {
    if (e) e.stopPropagation();
    setDeleteConfirm({
      isOpen: true,
      type: 'TRANSACTION',
      id: txId,
      title: 'Delete Transaction?',
      message: 'Are you sure you want to delete this Udhar transaction? The person’s outstanding balance will be automatically recalculated.'
    });
  };

  // --- Confirm Delete ---
  const handleConfirmDelete = async () => {
    try {
      if (deleteConfirm.type === 'PERSON') {
        await api.delete(`/udhar/people/${deleteConfirm.id}`);
        showAlert('success', 'Person deleted successfully');
        if (activePersonHistory === deleteConfirm.id) {
          setActivePersonHistory(null);
        }
        fetchData();
      } else if (deleteConfirm.type === 'TRANSACTION') {
        await api.delete(`/udhar/transactions/${deleteConfirm.id}`);
        showAlert('success', 'Transaction deleted successfully');
        if (activePersonHistory) {
          fetchPersonHistory(activePersonHistory);
        }
        fetchData();
      }
    } catch (err) {
      console.error('Delete error:', err);
      showAlert('error', err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleteConfirm({ isOpen: false, type: null, id: null, title: '', message: '' });
    }
  };

  // Format Currency
  const formatCurrency = (amount) => {
    return `₹${Math.abs(amount || 0).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Alert Banner */}
      {alert.message && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between shadow-sm transition-all duration-300 ${
            alert.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {alert.type === 'error' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            <span className="text-sm font-semibold">{alert.message}</span>
          </div>
          <button onClick={() => setAlert({ type: '', message: '' })} className="p-1 hover:bg-black/5 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-xs">
              <Handshake className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Lending & Borrowing</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage Udhar, track money lent to others and borrowed from others</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleOpenAddPerson}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <UserPlus className="h-4 w-4 text-gray-600" />
            <span>+ Add Person</span>
          </button>

          <button
            onClick={() => handleOpenAddTx()}
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Top 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total to Receive */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Total to Receive</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {formatCurrency(overview.totalToReceive)}
            </span>
            <span className="text-[11px] text-gray-400 font-medium mt-0.5 block">Money people owe you</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ArrowDownLeft className="h-6 w-6" />
          </div>
        </div>

        {/* Total to Pay */}
        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-red-700 uppercase tracking-wider block">Total to Pay</span>
            <span className="text-2xl font-black text-red-600 mt-1 block">
              {formatCurrency(overview.totalToPay)}
            </span>
            <span className="text-[11px] text-gray-400 font-medium mt-0.5 block">Money you owe others</span>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
            <ArrowUpRight className="h-6 w-6" />
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">Net Balance</span>
            <span className={`text-2xl font-black mt-1 block ${overview.netBalance > 0 ? 'text-emerald-600' : overview.netBalance < 0 ? 'text-red-600' : 'text-gray-800'}`}>
              {overview.netBalance >= 0 ? `+${formatCurrency(overview.netBalance)}` : `-${formatCurrency(overview.netBalance)}`}
            </span>
            <span className="text-[11px] text-gray-400 font-medium mt-0.5 block">
              {overview.netBalance > 0 ? 'Net in your favor' : overview.netBalance < 0 ? 'Net amount payable' : 'All balanced'}
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Scale className="h-6 w-6" />
          </div>
        </div>

        {/* Total People */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">People</span>
            <span className="text-2xl font-black text-gray-900 mt-1 block">{overview.peopleCount}</span>
            <span className="text-[11px] text-gray-400 font-medium mt-0.5 block">Active lending contacts</span>
          </div>
          <div className="p-3 bg-gray-50 text-gray-600 rounded-2xl">
            <Users className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All People' },
            { id: 'THEY_OWE_ME', label: 'They Owe Me' },
            { id: 'I_OWE_THEM', label: 'I Owe Them' },
            { id: 'SETTLED', label: 'Settled' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* People Grid View */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="animate-spin h-8 w-8 text-indigo-600 mb-2" />
          <span className="text-sm font-medium">Loading Lending & Borrowing records...</span>
        </div>
      ) : people.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {people.map(p => {
            const isTheyOwe = p.status === 'THEY_OWE_YOU';
            const isYouOwe = p.status === 'YOU_OWE_THEM';
            const isSettled = p.status === 'SETTLED';

            return (
              <div
                key={p._id}
                onClick={() => fetchPersonHistory(p._id)}
                className="p-5 bg-white rounded-2xl border border-gray-100 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Top Row: Avatar, Name & Card Actions */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm shadow-xs border border-indigo-100">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-gray-900 text-base truncate max-w-[150px]" title={p.name}>
                          {p.name}
                        </h4>
                        {p.phone ? (
                          <div className="flex items-center space-x-1 text-xs text-gray-400 mt-0.5">
                            <Phone className="h-3 w-3" />
                            <span>{p.phone}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 block mt-0.5">No phone added</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleOpenEditPerson(p, e)}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                        title="Edit Person"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeletePersonClick(p, e)}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                        title="Delete Person"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Note if present */}
                  {p.note && (
                    <p className="text-xs text-gray-500 italic mt-2.5 bg-gray-50 p-2 rounded-xl border border-gray-100">
                      "{p.note}"
                    </p>
                  )}

                  {/* Outstanding Balance Banner */}
                  <div
                    className={`mt-4 p-3.5 rounded-xl border flex items-center justify-between ${
                      isTheyOwe
                        ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                        : isYouOwe
                        ? 'bg-red-50/70 border-red-200/80 text-red-900'
                        : 'bg-gray-50 border-gray-200/80 text-gray-700'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block">
                        {isTheyOwe ? `${p.name} owes you` : isYouOwe ? `You owe ${p.name}` : 'Balance Status'}
                      </span>
                      <span
                        className={`text-lg font-black mt-0.5 block ${
                          isTheyOwe ? 'text-emerald-700' : isYouOwe ? 'text-red-700' : 'text-gray-700'
                        }`}
                      >
                        {isSettled ? 'Settled (₹0)' : formatCurrency(p.netBalance)}
                      </span>
                    </div>

                    <div
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        isTheyOwe
                          ? 'bg-emerald-600 text-white'
                          : isYouOwe
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {isTheyOwe ? 'They Owe' : isYouOwe ? 'You Owe' : 'Settled'}
                    </div>
                  </div>

                  {/* Given vs Received breakdown */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-400 block font-medium">You Gave / Lent</span>
                      <span className="font-bold text-gray-800 mt-0.5 block">{formatCurrency(p.totalGiven)}</span>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-400 block font-medium">You Received</span>
                      <span className="font-bold text-gray-800 mt-0.5 block">{formatCurrency(p.totalReceived)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => fetchPersonHistory(p._id)}
                    className="flex-1 py-1.5 px-2.5 rounded-xl border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-bold transition-all text-center"
                  >
                    View History ({p.transactionCount})
                  </button>

                  <button
                    onClick={(e) => handleOpenAddTx(p._id, 'GAVE', e)}
                    className="py-1.5 px-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Record Udhar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 bg-white rounded-3xl border border-dashed border-gray-200 text-center flex flex-col items-center justify-center">
          <Handshake className="h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-gray-800">No Lending & Borrowing Records Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md">
            {searchQuery ? 'No people match your search.' : 'Start tracking money you give to or borrow from friends, family, and colleagues.'}
          </p>
          <button
            onClick={handleOpenAddPerson}
            className="mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Add Your First Person</span>
          </button>
        </div>
      )}

      {/* Person Detailed History Modal */}
      {activePersonHistory && historyData.person && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 animate-fadeIn">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-xl font-black text-gray-900">{historyData.person.name} — Udhar History</h3>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      historyData.person.status === 'THEY_OWE_YOU'
                        ? 'bg-emerald-100 text-emerald-800'
                        : historyData.person.status === 'YOU_OWE_THEM'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {historyData.person.status === 'THEY_OWE_YOU'
                      ? `${historyData.person.name} owes you ${formatCurrency(historyData.person.netBalance)}`
                      : historyData.person.status === 'YOU_OWE_THEM'
                      ? `You owe ${historyData.person.name} ${formatCurrency(historyData.person.netBalance)}`
                      : 'Settled'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {historyData.person.phone ? `Phone: ${historyData.person.phone} • ` : ''}
                  Total Given: <span className="font-bold text-gray-800">{formatCurrency(historyData.person.totalGiven)}</span> •
                  Total Received: <span className="font-bold text-gray-800">{formatCurrency(historyData.person.totalReceived)}</span>
                </p>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <button
                  onClick={() => handleOpenAddTx(historyData.person._id)}
                  className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>+ Add Transaction</span>
                </button>
                <button
                  onClick={() => setActivePersonHistory(null)}
                  className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-all font-bold text-xs"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* History Table / Ledger */}
            <div className="flex-1 overflow-y-auto p-6">
              {historyLoading ? (
                <div className="py-16 flex items-center justify-center text-gray-400">
                  <Loader2 className="animate-spin h-6 w-6 text-indigo-600 mr-2" />
                  <span className="text-xs font-medium">Loading ledger records...</span>
                </div>
              ) : historyData.transactions.length > 0 ? (
                <div className="space-y-3">
                  <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 rounded-xl text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <span className="col-span-2">Date</span>
                    <span className="col-span-3">Type / Direction</span>
                    <span className="col-span-2 text-right">Amount</span>
                    <span className="col-span-3">Note</span>
                    <span className="col-span-2 text-right">Actions</span>
                  </div>

                  {historyData.transactions.map(tx => {
                    const isGave = tx.type === 'GAVE';
                    return (
                      <div
                        key={tx._id}
                        className="p-3.5 bg-gray-50/70 hover:bg-gray-100/60 rounded-xl border border-gray-100 transition-all flex flex-col md:grid md:grid-cols-12 md:items-center gap-2"
                      >
                        {/* Date */}
                        <div className="md:col-span-2 flex items-center space-x-1.5 text-xs text-gray-600 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          <span>{new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>

                        {/* Type Badge */}
                        <div className="md:col-span-3">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                              isGave
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isGave ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                            <span>{isGave ? 'You Gave Money' : 'You Received Money'}</span>
                          </span>
                        </div>

                        {/* Amount */}
                        <div className="md:col-span-2 md:text-right">
                          <span className={`text-sm font-extrabold ${isGave ? 'text-indigo-700' : 'text-emerald-700'}`}>
                            {formatCurrency(tx.amount)}
                          </span>
                        </div>

                        {/* Note */}
                        <div className="md:col-span-3 text-xs text-gray-600 truncate" title={tx.description || '—'}>
                          {tx.description ? <span>{tx.description}</span> : <span className="text-gray-400 italic">—</span>}
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-2 flex items-center justify-end space-x-1.5 pt-2 md:pt-0 border-t md:border-t-0 border-gray-200">
                          <button
                            onClick={(e) => handleOpenEditTx(tx, e)}
                            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                            title="Edit Transaction"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteTxClick(tx._id, e)}
                            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                            title="Delete Transaction"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-gray-400">
                  <Receipt className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-semibold text-gray-700">No transactions recorded for this person</p>
                  <p className="text-xs text-gray-400 mt-1">Use "+ Add Transaction" to record your first lending or borrowing entry.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Person Modal */}
      {isAddPersonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                <h4 className="text-lg font-bold text-gray-900">{editingPerson ? 'Edit Person' : 'Add Person'}</h4>
              </div>
              <button
                onClick={() => setIsAddPersonOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePerson} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Person Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isSavingPerson}
                  placeholder="e.g. Rahul, Amit Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={personForm.name}
                  onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  disabled={isSavingPerson}
                  placeholder="e.g. 98XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={personForm.phone}
                  onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Note / Relationship (Optional)
                </label>
                <input
                  type="text"
                  disabled={isSavingPerson}
                  placeholder="e.g. College Friend, Roommate"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={personForm.note}
                  onChange={(e) => setPersonForm({ ...personForm, note: e.target.value })}
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPersonOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPerson}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center space-x-1.5"
                >
                  {isSavingPerson ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingPerson ? 'Update Person' : 'Save Person'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Transaction Modal */}
      {isAddTxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Handshake className="h-5 w-5 text-indigo-600" />
                <h4 className="text-lg font-bold text-gray-900">
                  {editingTx ? 'Edit Udhar Transaction' : 'Record Udhar Transaction'}
                </h4>
              </div>
              <button
                onClick={() => setIsAddTxOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTx} className="space-y-4 mt-4">
              {/* Person Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Person <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={isSavingTx}
                  value={txForm.personId}
                  onChange={(e) => setTxForm({ ...txForm, personId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="" disabled>Select a person</option>
                  {people.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} {p.phone ? `(${p.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Direction Type Tabs */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Transaction Direction <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: 'GAVE' })}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                      txForm.type === 'GAVE'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>I Gave Money</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: 'RECEIVED' })}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                      txForm.type === 'RECEIVED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    <span>I Received Money</span>
                  </button>
                </div>
                <span className="text-[11px] text-gray-400 block mt-1">
                  {txForm.type === 'GAVE'
                    ? 'Use this when you lend money or pay back what you owed'
                    : 'Use this when you borrow money or receive repayment'}
                </span>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    disabled={isSavingTx}
                    placeholder="e.g. 5000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    disabled={isSavingTx}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={txForm.date}
                    onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                  />
                </div>
              </div>

              {/* Description / Note */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Note / Reason (Optional)
                </label>
                <input
                  type="text"
                  disabled={isSavingTx}
                  placeholder="e.g. Emergency loan, Partial repayment"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTxOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTx}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  {isSavingTx ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4" />
                      <span>{editingTx ? 'Updating...' : 'Recording...'}</span>
                    </>
                  ) : (
                    <span>{editingTx ? 'Update Transaction' : 'Record Transaction'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="flex items-center space-x-3 text-red-600 mb-3">
              <div className="p-2.5 bg-red-50 rounded-2xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-gray-900">{deleteConfirm.title}</h4>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">{deleteConfirm.message}</p>

            <div className="flex space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, type: null, id: null, title: '', message: '' })}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LendingBorrowing;
