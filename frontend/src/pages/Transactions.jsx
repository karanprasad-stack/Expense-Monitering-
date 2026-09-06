import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { Pencil, Trash2, Search, Filter, PlusCircle, ArrowUpDown, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const Transactions = () => {
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  
  // Feedback state
  const [warning, setWarning] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filtering & Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedSubcategoryFilter, setSelectedSubcategoryFilter] = useState('');

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, description: '', amount: 0 });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const d = new Date();
      const [budgetRes, expensesRes] = await Promise.all([
        api.get(`/budgets?month=${d.getMonth() + 1}&year=${d.getFullYear()}`),
        api.get('/expenses')
      ]);

      if (budgetRes.data) {
        const catRes = await api.get(`/categories?budgetId=${budgetRes.data._id}`);
        setCategories(catRes.data);
      }
      setExpenses(expensesRes.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setErrorMessage('Failed to load transaction data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpensesList = async () => {
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Clear previous feedback
    setWarning('');
    setErrorMessage('');
    setSuccessMessage('');

    // Validation
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than 0.');
      return;
    }

    if (!categoryId || !subcategoryId) {
      setErrorMessage('Please select both a Category and Subcategory.');
      return;
    }

    setIsSubmitting(true);

    // Generate unique client idempotency key
    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      if (editingExpenseId) {
        // Edit existing transaction
        const res = await api.put(`/expenses/${editingExpenseId}`, {
          amount: parsedAmount,
          description: description.trim() || 'General',
          date,
          categoryId,
          subcategoryId,
          paymentMethod
        });

        if (res.data.warning) {
          setWarning(res.data.warning);
        }
        setSuccessMessage('Transaction updated successfully!');
        resetForm();
        await fetchExpensesList();
      } else {
        // Create new transaction with idempotency header
        const res = await api.post('/expenses', {
          amount: parsedAmount,
          description: description.trim() || 'General',
          date,
          categoryId,
          subcategoryId,
          paymentMethod
        }, {
          headers: {
            'X-Idempotency-Key': idempotencyKey
          }
        });

        if (res.data.warning) {
          setWarning(res.data.warning);
        }
        setSuccessMessage(res.data.isDuplicate ? 'Transaction already added.' : 'Transaction recorded successfully!');
        resetForm();
        await fetchExpensesList();
      }
    } catch (error) {
      console.error('Submit transaction error:', error);
      const msg = error.response?.data?.message || (editingExpenseId ? 'Failed to update transaction. Please try again.' : 'Failed to add transaction. Please try again.');
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    }
  };

  const resetForm = () => {
    setEditingExpenseId(null);
    setAmount('');
    setDescription('');
    setCategoryId('');
    setSubcategoryId('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('UPI');
  };

  const handleStartEdit = (exp) => {
    setEditingExpenseId(exp._id);
    setAmount(exp.amount.toString());
    setDescription(exp.description === 'General' ? '' : exp.description);
    setDate(new Date(exp.date).toISOString().split('T')[0]);
    
    const catId = typeof exp.categoryId === 'object' && exp.categoryId !== null ? exp.categoryId._id : exp.categoryId;
    const subId = typeof exp.subcategoryId === 'object' && exp.subcategoryId !== null ? exp.subcategoryId._id : exp.subcategoryId;
    
    setCategoryId(catId || '');
    setSubcategoryId(subId || '');
    setPaymentMethod(exp.paymentMethod || 'UPI');
    setWarning('');
    setErrorMessage('');

    // Smooth scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    resetForm();
    setWarning('');
    setErrorMessage('');
  };

  const handleDeleteClick = (exp) => {
    setDeleteModal({
      isOpen: true,
      id: exp._id,
      description: exp.description || 'Transaction',
      amount: exp.amount
    });
  };

  const confirmDeleteExpense = async () => {
    if (!deleteModal.id) return;
    try {
      await api.delete(`/expenses/${deleteModal.id}`);
      setDeleteModal({ isOpen: false, id: null, description: '', amount: 0 });
      setSuccessMessage('Transaction deleted successfully.');
      if (editingExpenseId === deleteModal.id) {
        resetForm();
      }
      await fetchExpensesList();
    } catch (error) {
      console.error('Delete expense error:', error);
      setErrorMessage('Failed to delete transaction.');
    }
  };

  // Find subcategories for currently selected form category
  const selectedCat = categories.find(c => c._id === categoryId);
  const availableSubcategories = selectedCat ? selectedCat.subcategories || [] : [];

  // Filtered expenses list
  const filteredExpenses = expenses.filter(exp => {
    const catId = typeof exp.categoryId === 'object' && exp.categoryId !== null ? exp.categoryId._id : exp.categoryId;
    const catName = typeof exp.categoryId === 'object' && exp.categoryId !== null ? exp.categoryId.name : '';
    const subId = typeof exp.subcategoryId === 'object' && exp.subcategoryId !== null ? exp.subcategoryId._id : exp.subcategoryId;
    const subName = typeof exp.subcategoryId === 'object' && exp.subcategoryId !== null ? exp.subcategoryId.name : '';

    if (selectedCategoryFilter && catId !== selectedCategoryFilter) return false;
    if (selectedSubcategoryFilter && subId !== selectedSubcategoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchDesc = exp.description?.toLowerCase().includes(q);
      const matchCat = catName?.toLowerCase().includes(q);
      const matchSub = subName?.toLowerCase().includes(q);
      const matchAmount = exp.amount?.toString().includes(q);
      const matchMethod = exp.paymentMethod?.toLowerCase().includes(q);
      return matchDesc || matchCat || matchSub || matchAmount || matchMethod;
    }
    return true;
  });

  const totalFilteredAmount = filteredExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-500 dark:text-slate-400 font-medium">
        <Loader2 className="animate-spin mr-2 h-6 w-6 text-brand-500" />
        <span>Loading Transactions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Transactions</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Record, edit, and monitor all your expenses</p>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {warning && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="font-semibold text-sm">{warning}</span>
          </div>
          <button onClick={() => setWarning('')} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 text-xs font-bold p-1 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0" />
            <span className="font-semibold text-sm">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 text-xs font-bold p-1 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="font-semibold text-sm">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 text-xs font-bold p-1 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Expense Form (Add / Edit) */}
      <div className={`p-6 rounded-2xl shadow-sm border transition-all ${
        editingExpenseId 
          ? 'bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 ring-2 ring-indigo-500/20' 
          : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {editingExpenseId ? (
              <>
                <Pencil className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-indigo-950 dark:text-indigo-300">Edit Transaction</h3>
                <span className="text-xs bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">Editing</span>
              </>
            ) : (
              <>
                <PlusCircle className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">Record New Expense</h3>
              </>
            )}
          </div>
          {editingExpenseId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-slate-100 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-lg font-semibold transition-all hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleFormSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Date</label>
            <input
              type="date"
              required
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Category</label>
            <select
              required
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId('');
              }}
            >
              <option value="" disabled>Select Category</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          {/* Subcategory */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Subcategory</label>
            <select
              required
              disabled={!categoryId || isSubmitting}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:text-gray-400 dark:disabled:text-slate-500"
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
            >
              <option value="" disabled>{categoryId ? 'Select Subcategory' : 'Choose category first'}</option>
              {availableSubcategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 150"
              required
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm font-semibold placeholder-gray-400 dark:placeholder-slate-500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Payment Method</label>
            <select
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="UPI">UPI / GPay / PhonePe</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Cash">Cash</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div className="sm:col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Note / Description</label>
            <input
              type="text"
              placeholder="e.g. Groceries from Supermarket"
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm placeholder-gray-400 dark:placeholder-slate-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Submit Action Buttons */}
          <div className="sm:col-span-2 md:col-span-3 flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-8 py-3 rounded-xl font-semibold shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                isSubmitting
                  ? 'bg-gray-400 dark:bg-slate-700 text-white cursor-not-allowed opacity-80'
                  : editingExpenseId
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 active:scale-[0.99]'
                  : 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/20 active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 text-white" />
                  <span>{editingExpenseId ? 'Updating...' : 'Adding...'}</span>
                </>
              ) : (
                <span>{editingExpenseId ? 'Update Transaction' : 'Add Expense'}</span>
              )}
            </button>

            {editingExpenseId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Transactions History Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
        {/* Title and Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">Transaction History</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Showing {filteredExpenses.length} transactions {filteredExpenses.length > 0 && `(Total: ₹${totalFilteredAmount.toLocaleString('en-IN')})`}
            </p>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[180px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => {
                setSelectedCategoryFilter(e.target.value);
                setSelectedSubcategoryFilter('');
              }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-xs bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>

            {/* Subcategory Filter */}
            {selectedCategoryFilter && (
              <select
                value={selectedSubcategoryFilter}
                onChange={(e) => setSelectedSubcategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-xs bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200"
              >
                <option value="">All Subcategories</option>
                {categories.find(c => c._id === selectedCategoryFilter)?.subcategories?.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            )}

            {(searchTerm || selectedCategoryFilter || selectedSubcategoryFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategoryFilter('');
                  setSelectedSubcategoryFilter('');
                }}
                className="p-1.5 text-xs text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center gap-1 font-semibold cursor-pointer"
                title="Clear Filters"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Transactions Table / Responsive List */}
        {filteredExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4">Category / Subcategory</th>
                  <th className="pb-3 pr-4">Method</th>
                  <th className="pb-3 pr-4 text-right">Amount</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/80">
                {filteredExpenses.map((exp) => {
                  const catName = typeof exp.categoryId === 'object' && exp.categoryId !== null ? exp.categoryId.name : 'Unknown';
                  const subName = typeof exp.subcategoryId === 'object' && exp.subcategoryId !== null ? exp.subcategoryId.name : 'Unknown';
                  const isCurrentEditing = editingExpenseId === exp._id;

                  return (
                    <tr
                      key={exp._id}
                      className={`hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isCurrentEditing ? 'bg-indigo-50/50 dark:bg-indigo-950/30 font-medium' : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3.5 pr-4 text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 pr-4">
                        <span className="font-semibold text-gray-800 dark:text-slate-100 block truncate max-w-[200px]">{exp.description || 'General'}</span>
                      </td>

                      {/* Category & Subcategory tags */}
                      <td className="py-3.5 pr-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide">
                            {catName}
                          </span>
                          <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide">
                            {subName}
                          </span>
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 pr-4 text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        <span className="text-[11px] bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200/60 dark:border-slate-700 px-2 py-0.5 rounded-full font-medium">
                          {exp.paymentMethod || 'UPI'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 pr-4 text-right whitespace-nowrap font-extrabold text-red-600 dark:text-red-400">
                        - ₹{exp.amount.toLocaleString('en-IN')}
                      </td>

                      {/* Actions (Edit & Delete) */}
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleStartEdit(exp)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all font-semibold cursor-pointer"
                            title="Edit Transaction"
                            aria-label="Edit transaction"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(exp)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all font-semibold cursor-pointer"
                            title="Delete Transaction"
                            aria-label="Delete transaction"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
            <span className="text-4xl mb-2">💸</span>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">No transactions found matching your criteria.</p>
            {(searchTerm || selectedCategoryFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategoryFilter('');
                  setSelectedSubcategoryFilter('');
                }}
                className="mt-2 text-xs text-brand-600 dark:text-brand-400 hover:underline font-bold cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-slate-800 transform scale-100 transition-all duration-200">
            <div className="flex flex-col items-center text-center space-y-4 mb-6">
              <div className="p-4 bg-red-50 dark:bg-red-950/60 text-red-500 dark:text-red-400 rounded-2xl">
                <Trash2 className="h-7 w-7" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-950 dark:text-slate-100">Delete Transaction?</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">This will revert the spent amount in your budget.</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-slate-300 text-center mb-6">
              Are you sure you want to delete <span className="font-bold text-gray-800 dark:text-slate-100">"{deleteModal.description}"</span> (- ₹{deleteModal.amount})?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, id: null, description: '', amount: 0 })}
                className="w-full py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 text-sm font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExpense}
                className="w-full py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-semibold transition-all shadow-md shadow-red-500/20 cursor-pointer"
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

export default Transactions;

