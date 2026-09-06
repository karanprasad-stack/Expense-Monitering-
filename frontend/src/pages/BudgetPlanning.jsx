import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Pencil,
  Trash2,
  Receipt,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext';

const BudgetPlanning = () => {
  const { isDark } = useContext(ThemeContext);
  const [budget, setBudget] = useState(null);
  const [categories, setCategories] = useState([]);
  const [totalBudgetInput, setTotalBudgetInput] = useState('');
  const [loading, setLoading] = useState(true);

  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const [newCatName, setNewCatName] = useState('');
  const [newSubcatName, setNewSubcatName] = useState('');
  const [newSubcatAmount, setNewSubcatAmount] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editingBudgetAmount, setEditingBudgetAmount] = useState('');

  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const [editingSubcategoryId, setEditingSubcategoryId] = useState(null);
  const [editingSubcategoryName, setEditingSubcategoryName] = useState('');
  const [editingSubcategoryAmount, setEditingSubcategoryAmount] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: '', id: '', name: '', extra: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Subcategory Transactions Panel State
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [subcategoryTransactions, setSubcategoryTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Edit Transaction Modal State
  const [editTxModal, setEditTxModal] = useState({
    isOpen: false,
    id: null,
    amount: '',
    description: '',
    date: '',
    categoryId: '',
    subcategoryId: '',
    paymentMethod: 'UPI'
  });
  const [isUpdatingTx, setIsUpdatingTx] = useState(false);

  useEffect(() => {
    fetchBudgetAndCategories();
  }, [month, year]);

  const fetchBudgetAndCategories = async () => {
    try {
      setLoading(true);
      const budgetRes = await api.get(`/budgets?month=${month}&year=${year}`);
      setBudget(budgetRes.data);
      setTotalBudgetInput(budgetRes.data.totalBudget);

      const catRes = await api.get(`/categories?budgetId=${budgetRes.data._id}`);
      setCategories(catRes.data);

      // If a subcategory is currently selected, refresh its transactions
      if (selectedSubcategory) {
        fetchSubcategoryTransactions(selectedSubcategory._id);
      }
    } catch (error) {
      setBudget(null);
      setCategories([]);
      setSelectedSubcategory(null);
      setSubcategoryTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategoryTransactions = async (subId) => {
    try {
      setLoadingTransactions(true);
      const res = await api.get(`/expenses?subcategoryId=${subId}&month=${month}&year=${year}`);
      setSubcategoryTransactions(res.data || []);
    } catch (error) {
      console.error('Error fetching subcategory transactions:', error);
      setSubcategoryTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleSelectSubcategory = (sub, cat) => {
    if (selectedSubcategory?._id === sub._id) {
      // Toggle off if already selected
      setSelectedSubcategory(null);
      setSubcategoryTransactions([]);
      return;
    }
    const fullSub = {
      ...sub,
      categoryName: cat ? cat.name : 'Category',
      categoryId: cat ? cat._id : sub.categoryId
    };
    setSelectedSubcategory(fullSub);
    fetchSubcategoryTransactions(sub._id);
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleUpdateBudget = async (e) => {
    e.preventDefault();
    try {
      await api.post('/budgets', { month, year, totalBudget: Number(editingBudgetAmount) });
      setIsEditingBudget(false);
      showSuccess('Budget limit updated successfully!');
      fetchBudgetAndCategories();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.error(msg);
      showError('Error updating budget: ' + msg);
    }
  };

  const handleUpdateCategory = async (catId) => {
    if (!editingCategoryName.trim()) return;
    try {
      await api.put(`/categories/${catId}`, { name: editingCategoryName });
      setEditingCategoryId(null);
      setEditingCategoryName('');
      showSuccess('Category renamed successfully!');
      fetchBudgetAndCategories();
    } catch (error) {
      console.error(error);
      showError('Error updating category');
    }
  };

  const handleDeleteCategoryClick = (catId, catName) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'category',
      id: catId,
      name: catName,
      extra: 'All subcategories and associated transactions under this category will also be deleted.'
    });
  };

  const handleUpdateSubcategory = async (subId) => {
    if (!editingSubcategoryName.trim()) return;
    try {
      await api.put(`/categories/subcategories/${subId}`, {
        name: editingSubcategoryName,
        allocatedBudget: Number(editingSubcategoryAmount)
      });
      setEditingSubcategoryId(null);
      setEditingSubcategoryName('');
      setEditingSubcategoryAmount('');
      showSuccess('Subcategory updated successfully!');
      fetchBudgetAndCategories();
    } catch (error) {
      console.error(error);
      showError('Error updating subcategory');
    }
  };

  const handleDeleteSubcategoryClick = (subId, subName, allocatedBudget) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'subcategory',
      id: subId,
      name: subName,
      extra: `Allocated budget of ₹${allocatedBudget} and all associated transactions will be removed.`
    });
  };

  const confirmDelete = async () => {
    const { type, id } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, type: '', id: '', name: '', extra: '' });
    try {
      if (type === 'category') {
        await api.delete(`/categories/${id}`);
        showSuccess('Category deleted successfully.');
      } else if (type === 'subcategory') {
        await api.delete(`/categories/subcategories/${id}`);
        if (selectedSubcategory?._id === id) {
          setSelectedSubcategory(null);
          setSubcategoryTransactions([]);
        }
        showSuccess('Subcategory deleted successfully.');
      }
      fetchBudgetAndCategories();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || error.message;
      showError(`Failed to delete ${type}: ${msg}`);
    }
  };

  const createBudget = async (e) => {
    e.preventDefault();
    try {
      await api.post('/budgets', { month, year, totalBudget: Number(totalBudgetInput) });
      showSuccess('Monthly budget created!');
      fetchBudgetAndCategories();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.error(msg);
      showError('Error: ' + msg);
    }
  };

  const createCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/categories', { name: newCatName, budgetId: budget._id });
      setNewCatName('');
      showSuccess('Category added successfully!');
      fetchBudgetAndCategories();
    } catch (error) {
      console.error(error);
      showError('Failed to create category');
    }
  };

  const createSubcategory = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/categories/${selectedCatId}/subcategories`, {
        name: newSubcatName.trim() || 'General',
        allocatedBudget: Number(newSubcatAmount)
      });
      setNewSubcatName('');
      setNewSubcatAmount('');
      setSelectedCatId('');
      showSuccess('Subcategory added successfully!');
      fetchBudgetAndCategories();
    } catch (error) {
      console.error(error);
      showError('Failed to create subcategory');
    }
  };

  // Transaction Edit Modal Handlers
  const handleOpenEditTx = (tx) => {
    const catId = typeof tx.categoryId === 'object' && tx.categoryId !== null ? tx.categoryId._id : tx.categoryId;
    const subId = typeof tx.subcategoryId === 'object' && tx.subcategoryId !== null ? tx.subcategoryId._id : tx.subcategoryId;

    setEditTxModal({
      isOpen: true,
      id: tx._id,
      amount: tx.amount.toString(),
      description: tx.description === 'General' ? '' : tx.description,
      date: new Date(tx.date).toISOString().split('T')[0],
      categoryId: catId || '',
      subcategoryId: subId || '',
      paymentMethod: tx.paymentMethod || 'UPI'
    });
  };

  const handleSaveEditTx = async (e) => {
    e.preventDefault();
    if (isUpdatingTx) return;

    const parsedAmount = Number(editTxModal.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showError('Please enter a valid amount.');
      return;
    }

    try {
      setIsUpdatingTx(true);
      await api.put(`/expenses/${editTxModal.id}`, {
        amount: parsedAmount,
        description: editTxModal.description.trim() || 'General',
        date: editTxModal.date,
        categoryId: editTxModal.categoryId,
        subcategoryId: editTxModal.subcategoryId,
        paymentMethod: editTxModal.paymentMethod
      });

      setEditTxModal({ isOpen: false, id: null, amount: '', description: '', date: '', categoryId: '', subcategoryId: '', paymentMethod: 'UPI' });
      showSuccess('Transaction updated successfully!');
      await fetchBudgetAndCategories();
      if (selectedSubcategory) {
        await fetchSubcategoryTransactions(selectedSubcategory._id);
      }
    } catch (error) {
      console.error('Update transaction error:', error);
      showError('Failed to update transaction. Please try again.');
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleDeleteTx = async (txId) => {
    try {
      await api.delete(`/expenses/${txId}`);
      showSuccess('Transaction removed.');
      await fetchBudgetAndCategories();
      if (selectedSubcategory) {
        await fetchSubcategoryTransactions(selectedSubcategory._id);
      }
    } catch (error) {
      console.error('Delete transaction error:', error);
      showError('Failed to delete transaction.');
    }
  };  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-500 dark:text-slate-400 font-medium">
        <Loader2 className="animate-spin mr-2 h-6 w-6 text-brand-500" />
        <span>Loading Budget Planning...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Error Message Alert */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/60 rounded-2xl p-4 flex items-center space-x-3 text-red-700 dark:text-red-300 animate-pulse">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="ml-auto text-red-400 dark:text-red-400 hover:text-red-600 dark:hover:text-red-200 font-bold text-xs cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Success Message Alert */}
      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 rounded-2xl p-4 flex items-center space-x-3 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="ml-auto text-emerald-400 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-200 font-bold text-xs cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Budget Planning</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Allocate budgets to categories & monitor utilization</p>
        </div>
        <div className="flex space-x-3 sm:space-x-4">
          <select 
            value={month} 
            onChange={(e) => setMonth(Number(e.target.value))} 
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))} 
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {!budget ? (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">Create Budget for this Month</h3>
          <form onSubmit={createBudget} className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Total Budget Amount (₹)</label>
              <input
                type="number"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. 50000"
                value={totalBudgetInput}
                onChange={(e) => setTotalBudgetInput(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-brand-500 text-white rounded-xl shadow-md hover:bg-brand-600 transition-all font-semibold h-[44px] cursor-pointer">
              Set Budget
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Budget Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-blue-100 dark:border-slate-800">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-slate-400 font-semibold">Total Budget</p>
                  {isEditingBudget ? (
                    <form onSubmit={handleUpdateBudget} className="mt-2 flex items-center space-x-2 w-full">
                      <input
                        type="number"
                        required
                        className="w-full max-w-[120px] px-2 py-1 text-base rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
                        value={editingBudgetAmount}
                        onChange={(e) => setEditingBudgetAmount(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="px-2.5 py-1 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-xs font-semibold transition-all cursor-pointer">
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingBudget(false)}
                        className="px-2 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 text-xs font-semibold transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">₹{budget.totalBudget.toLocaleString('en-IN')}</p>
                  )}
                </div>
                {!isEditingBudget && (
                  <button
                    onClick={() => {
                      setEditingBudgetAmount(budget.totalBudget);
                      setIsEditingBudget(true);
                    }}
                    className="p-1.5 text-gray-400 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                    title="Edit Budget"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-indigo-100 dark:border-slate-800">
              <p className="text-sm text-gray-500 dark:text-slate-400 font-semibold">Allocated</p>
              <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-300 mt-1">₹{budget.allocatedAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-green-100 dark:border-slate-800">
              <p className="text-sm text-gray-500 dark:text-slate-400 font-semibold">Unallocated</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-300 mt-1">₹{budget.remainingAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Add Category Form */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4">Add Parent Category</h3>
            <form onSubmit={createCategory} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="text"
                placeholder="e.g. Living Expenses, Personal, Investments"
                required
                className="w-full sm:flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
              <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-brand-500 text-white rounded-xl shadow-md hover:bg-brand-600 transition-all font-semibold text-sm cursor-pointer">
                Add Category
              </button>
            </form>
          </div>

          {/* Add Subcategory Form */}
          {categories.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4">Add Subcategory</h3>
              <form onSubmit={createSubcategory} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                >
                  <option value="" disabled>Select Category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Name (e.g. Eggs, Groceries)"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={newSubcatName}
                  onChange={(e) => setNewSubcatName(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Budget (₹)"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={newSubcatAmount}
                  onChange={(e) => setNewSubcatAmount(e.target.value)}
                />
                <button type="submit" className="w-full px-6 py-2.5 bg-brand-500 text-white rounded-xl shadow-md hover:bg-brand-600 transition-all font-semibold text-sm cursor-pointer">
                  Add Subcategory
                </button>
              </form>
            </div>
          )}

          {/* Subcategory Interactive Transactions Panel (When a subcategory is clicked in chart or card) */}
          {selectedSubcategory && (
            <div className="bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/30 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 p-6 rounded-2xl shadow-md border-2 border-indigo-300 dark:border-indigo-800 space-y-4 animate-fadeIn transition-all">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100 dark:border-indigo-900/60">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-indigo-600 text-white font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Filtered Subcategory
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">{selectedSubcategory.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Parent Category: <span className="font-semibold text-gray-700 dark:text-slate-200">{selectedSubcategory.categoryName}</span> • Month: <span className="font-semibold text-gray-700 dark:text-slate-200">{new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedSubcategory(null)}
                    className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Clear Filter / Close</span>
                  </button>
                </div>
              </div>

              {/* Subcategory Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
                  <span className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold block">Allocated Budget</span>
                  <span className="text-base font-bold text-gray-800 dark:text-slate-100">₹{selectedSubcategory.allocatedBudget.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
                  <span className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold block">Total Spent</span>
                  <span className={`text-base font-bold ${selectedSubcategory.spentAmount > selectedSubcategory.allocatedBudget ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    ₹{selectedSubcategory.spentAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
                  <span className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold block">Remaining</span>
                  <span className={`text-base font-bold ${selectedSubcategory.allocatedBudget - selectedSubcategory.spentAmount < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-slate-100'}`}>
                    ₹{Math.max(0, selectedSubcategory.allocatedBudget - selectedSubcategory.spentAmount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
                  <span className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold block">Transactions</span>
                  <span className="text-base font-bold text-indigo-700 dark:text-indigo-400">{subcategoryTransactions.length}</span>
                </div>
              </div>

              {/* Transactions Card Grid (matching Dashboard recent transactions layout) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Receipt className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Transactions for {selectedSubcategory.name}</span>
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-slate-700 shadow-xs">
                    {subcategoryTransactions.length} transaction{subcategoryTransactions.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {loadingTransactions ? (
                  <div className="py-10 flex items-center justify-center text-gray-400 dark:text-slate-500">
                    <Loader2 className="animate-spin h-6 w-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-medium">Loading transactions...</span>
                  </div>
                ) : subcategoryTransactions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subcategoryTransactions.map(tx => (
                      <div
                        key={tx._id}
                        className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-indigo-100/90 dark:border-slate-700/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-gray-900 dark:text-slate-100 text-sm truncate max-w-[150px]" title={tx.description || 'General'}>
                              {tx.description || 'General'}
                            </span>
                            <span className="text-sm font-bold text-red-600 dark:text-red-400 pl-2 whitespace-nowrap">
                              - ₹{tx.amount.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 dark:text-slate-400 mt-2.5">
                            <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                              {selectedSubcategory.categoryName || tx.categoryName || 'Category'}
                            </span>
                            <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                              {selectedSubcategory.name || tx.subcategoryName}
                            </span>
                            {tx.paymentMethod && (
                              <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded font-medium">
                                {tx.paymentMethod}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-[10px] text-gray-400 dark:text-slate-400 mt-4 pt-3 border-t border-gray-100 dark:border-slate-700/60 flex justify-between items-center font-medium">
                          <div className="flex items-center space-x-1.5 text-gray-400 dark:text-slate-400">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleOpenEditTx(tx)}
                              className="text-gray-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1.5 rounded-lg border border-gray-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:border-indigo-200 transition-colors cursor-pointer"
                              title="Edit Transaction"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTx(tx._id)}
                              className="text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg border border-gray-100 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-200 transition-colors cursor-pointer"
                              title="Delete Transaction"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-white/80 dark:bg-slate-800/60 rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-900/60 text-center text-gray-400 dark:text-slate-400">
                    <Receipt className="h-10 w-10 mx-auto text-indigo-300 dark:text-indigo-500 mb-2" />
                    <p className="text-sm text-gray-700 dark:text-slate-300 font-semibold">No transactions recorded for {selectedSubcategory.name}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">Expenses recorded under this subcategory in this month will appear as cards here.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Categories and Subcategories List */}
          <div className="space-y-6">
            {categories.map(cat => {
              const totalOverspent = cat.subcategories ? cat.subcategories.reduce((acc, sub) => {
                const over = sub.spentAmount - sub.allocatedBudget;
                return acc + (over > 0 ? over : 0);
              }, 0) : 0;

              return (
                <div key={cat._id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                  {/* Category Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
                    {editingCategoryId === cat._id ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                        <input
                          type="text"
                          required
                          className="flex-1 px-3 py-1.5 text-base rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          autoFocus
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateCategory(cat._id)}
                            className="flex-1 sm:flex-initial px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm font-semibold transition-all shadow-sm cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingCategoryId(null);
                              setEditingCategoryName('');
                            }}
                            className="flex-1 sm:flex-initial px-3 py-1.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 text-sm font-semibold transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2">
                          <Layers className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                          <h4 className="text-lg font-bold text-gray-800 dark:text-slate-100">{cat.name}</h4>
                        </div>
                        <div className="flex items-center space-x-2 self-end sm:self-auto">
                          <button
                            onClick={() => {
                              setEditingCategoryId(cat._id);
                              setEditingCategoryName(cat.name);
                            }}
                            className="text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-gray-200 dark:border-slate-700 text-xs px-2.5 py-1.5 rounded-lg transition-colors font-semibold flex items-center space-x-1 cursor-pointer"
                            title="Edit Category Name"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCategoryClick(cat._id, cat.name)}
                            className="text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 border border-gray-200 dark:border-slate-700 text-xs px-2.5 py-1.5 rounded-lg transition-colors font-semibold flex items-center space-x-1 cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {cat.subcategories && cat.subcategories.length > 0 ? (
                    <div className="space-y-6">
                      {/* Subcategory Small Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {cat.subcategories.map(sub => {
                          const actualPercent = sub.allocatedBudget > 0 ? (sub.spentAmount / sub.allocatedBudget) * 100 : 0;
                          const isOverspent = sub.spentAmount > sub.allocatedBudget;
                          const isWarning = !isOverspent && actualPercent >= 70;

                          const isEditing = editingSubcategoryId === sub._id;
                          const isSelected = selectedSubcategory?._id === sub._id;
                          const hoverBorderClass = isSelected
                            ? 'border-indigo-500 ring-2 ring-indigo-400/30 bg-indigo-50/20 dark:bg-indigo-950/30'
                            : isOverspent
                            ? 'hover:border-red-500'
                            : isWarning
                            ? 'hover:border-orange-500'
                            : 'hover:border-brand-500';

                          return (
                            <div
                              key={sub._id}
                              onClick={() => !isEditing && handleSelectSubcategory(sub, cat)}
                              className={`p-4 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-700/60 flex items-center justify-between group hover:shadow-md min-h-[110px] relative transition-all duration-200 cursor-pointer ${hoverBorderClass}`}
                            >
                              {isEditing ? (
                                <div className="space-y-2 w-full" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                    placeholder="Subcategory Name"
                                    value={editingSubcategoryName}
                                    onChange={(e) => setEditingSubcategoryName(e.target.value)}
                                    autoFocus
                                  />
                                  <input
                                    type="number"
                                    required
                                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 focus:outline-none focus:border-brand-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                    placeholder="Budget (₹)"
                                    value={editingSubcategoryAmount}
                                    onChange={(e) => setEditingSubcategoryAmount(e.target.value)}
                                  />
                                  <div className="flex space-x-2 justify-end">
                                    <button
                                      onClick={() => handleUpdateSubcategory(sub._id)}
                                      className="px-3 py-1 bg-brand-500 text-white text-xs rounded-lg hover:bg-brand-600 font-semibold transition-all shadow-sm cursor-pointer"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingSubcategoryId(null);
                                        setEditingSubcategoryName('');
                                        setEditingSubcategoryAmount('');
                                      }}
                                      className="px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 font-semibold transition-all cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full flex flex-col justify-between space-y-2.5">
                                  {/* Top Row: Subcategory Name & Actions */}
                                  <div className="flex items-center justify-between w-full">
                                    <span className="font-bold text-gray-800 dark:text-slate-100 truncate block text-sm" title={sub.name}>
                                      {sub.name}
                                    </span>
                                    {/* Visible Actions */}
                                    <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingSubcategoryId(sub._id);
                                          setEditingSubcategoryName(sub.name);
                                          setEditingSubcategoryAmount(sub.allocatedBudget);
                                        }}
                                        className="p-1.5 rounded-lg border border-gray-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:border-indigo-200 transition-all shadow-xs cursor-pointer"
                                        title="Edit Subcategory"
                                        aria-label="Edit subcategory"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteSubcategoryClick(sub._id, sub.name, sub.allocatedBudget);
                                        }}
                                        className="p-1.5 rounded-lg border border-gray-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-200 transition-all shadow-xs cursor-pointer"
                                        title="Delete Subcategory"
                                        aria-label="Delete subcategory"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Middle Row: Spending & Donut Chart */}
                                  <div className="flex items-center justify-between">
                                    <div className="min-w-0 flex-1 pr-2">
                                      <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                                        Spent <span className="font-bold text-gray-800 dark:text-slate-100">₹{sub.spentAmount.toLocaleString('en-IN')}</span> of ₹{sub.allocatedBudget.toLocaleString('en-IN')}
                                      </div>
                                      {sub.spentAmount > sub.allocatedBudget ? (
                                        <div className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-0.5 flex items-center">
                                          ⚠️ Over budget by ₹{(sub.spentAmount - sub.allocatedBudget).toLocaleString('en-IN')}
                                        </div>
                                      ) : (
                                        <div className="text-[10px] text-gray-400 dark:text-slate-400 mt-0.5">
                                          ₹{Math.max(0, sub.allocatedBudget - sub.spentAmount).toLocaleString('en-IN')} remaining
                                        </div>
                                      )}
                                    </div>

                                    {/* Donut Chart */}
                                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center relative">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                          <Pie
                                            data={(() => {
                                              return sub.spentAmount === 0 && sub.allocatedBudget === 0
                                                ? [{ name: 'Remaining', value: 1 }]
                                                : [
                                                    { name: 'Spent', value: sub.spentAmount },
                                                    { name: 'Remaining', value: Math.max(0, sub.allocatedBudget - sub.spentAmount) }
                                                  ].filter(item => item.value > 0);
                                            })()}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={8}
                                            outerRadius={20}
                                            dataKey="value"
                                          >
                                            {(() => {
                                              const isZero = sub.spentAmount === 0 && sub.allocatedBudget === 0;
                                              const pieData = isZero
                                                ? [{ name: 'Remaining', value: 1 }]
                                                : [
                                                    { name: 'Spent', value: sub.spentAmount },
                                                    { name: 'Remaining', value: Math.max(0, sub.allocatedBudget - sub.spentAmount) }
                                                  ].filter(item => item.value > 0);
                                              return pieData.map(item => {
                                                if (item.name === 'Spent') {
                                                  return <Cell key="spent" fill={isOverspent ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981'} />;
                                                }
                                                return <Cell key="remaining" fill={isDark ? '#334155' : '#d1d5db'} />;
                                              });
                                            })()}
                                          </Pie>
                                          <Tooltip
                                            formatter={(value) => `₹${value}`}
                                            contentStyle={{ 
                                              fontSize: '10px', 
                                              padding: '2px 6px', 
                                              borderRadius: '6px', 
                                              border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
                                              backgroundColor: isDark ? '#0f172a' : '#ffffff',
                                              color: isDark ? '#f8fafc' : '#0f172a'
                                            }}
                                            itemStyle={{ color: isDark ? '#f8fafc' : '#1f2937' }}
                                          />
                                        </PieChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>

                                  {/* Bottom Row: Explicit View Transactions button & percentage badge */}
                                  <div className="pt-2 border-t border-gray-100 dark:border-slate-700/60 flex items-center justify-between">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectSubcategory(sub, cat);
                                      }}
                                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer ${
                                        isSelected
                                          ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-100 dark:border-indigo-900/40'
                                      }`}
                                    >
                                      <Receipt className="h-3 w-3" />
                                      <span>View Transactions</span>
                                    </button>
                                    <span
                                      className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md"
                                      style={{
                                        color: isOverspent ? (isDark ? '#f87171' : '#ef4444') : isWarning ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#4ade80' : '#059669'),
                                        backgroundColor: isOverspent ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2') : isWarning ? (isDark ? 'rgba(245, 158, 11, 0.2)' : '#fffbeb') : (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5')
                                      }}
                                    >
                                      {actualPercent.toFixed(0)}% Utilized
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Subcategory Allocation Breakdown and Color Legend (Interactive Clickable Pie Chart) */}
                      <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex flex-col md:flex-row items-center md:items-start gap-6">
                        {/* Allocation Chart */}
                        <div className="w-full md:w-48 h-40 flex-shrink-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-800/40 rounded-xl p-2 border border-gray-100 dark:border-slate-800 self-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  ...cat.subcategories.map(sub => ({
                                    _id: sub._id,
                                    name: sub.name,
                                    value: sub.allocatedBudget || 0,
                                    isOverspent: false,
                                    subObject: sub
                                  })),
                                  ...(totalOverspent > 0 ? [{
                                    name: 'Total Overspent',
                                    value: totalOverspent,
                                    isOverspent: true
                                  }] : [])
                                ].filter(item => item.value > 0)}
                                cx="50%"
                                cy="50%"
                                innerRadius={28}
                                outerRadius={46}
                                paddingAngle={2}
                                dataKey="value"
                                className="cursor-pointer"
                                onClick={(entry) => {
                                  if (entry && entry.subObject) {
                                    handleSelectSubcategory(entry.subObject, cat);
                                  }
                                }}
                              >
                                {(() => {
                                  const chartData = [
                                    ...cat.subcategories.map(sub => ({
                                      _id: sub._id,
                                      name: sub.name,
                                      value: sub.allocatedBudget || 0,
                                      isOverspent: false,
                                      subObject: sub
                                    })),
                                    ...(totalOverspent > 0 ? [{
                                      name: 'Total Overspent',
                                      value: totalOverspent,
                                      isOverspent: true
                                    }] : [])
                                  ].filter(item => item.value > 0);

                                  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];

                                  return chartData.map((item, idx) => {
                                    if (item.isOverspent) {
                                      return <Cell key="cell-overspent" fill="#ef4444" />;
                                    }
                                    const subIdx = cat.subcategories.findIndex(s => s.name === item.name);
                                    const color = COLORS[subIdx !== -1 ? subIdx % COLORS.length : idx % COLORS.length];
                                    const isSelected = selectedSubcategory?._id === item._id;

                                    return (
                                      <Cell
                                        key={`cell-${idx}`}
                                        fill={color}
                                        stroke={isSelected ? '#4f46e5' : isDark ? '#0f172a' : '#ffffff'}
                                        strokeWidth={isSelected ? 3 : 1}
                                        className="cursor-pointer hover:opacity-85 transition-all"
                                      />
                                    );
                                  });
                                })()}
                              </Pie>
                              <Tooltip
                                formatter={(value) => `₹${value}`}
                                contentStyle={{ 
                                  fontSize: '12px', 
                                  borderRadius: '8px', 
                                  border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
                                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                                  color: isDark ? '#f8fafc' : '#0f172a'
                                }}
                                itemStyle={{ color: isDark ? '#f8fafc' : '#1f2937' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <span className="text-[10px] text-gray-400 dark:text-slate-400 font-medium mt-0.5">Click slice to view transactions</span>
                        </div>

                        {/* Clickable Legend */}
                        <div className="flex-1 w-full">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                              Subcategory Allocation Breakdown
                            </h5>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Click any item to filter</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {cat.subcategories.map((sub, idx) => {
                              const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];
                              const color = COLORS[idx % COLORS.length];
                              const isSelected = selectedSubcategory?._id === sub._id;

                              return (
                                <button
                                  key={sub._id}
                                  type="button"
                                  onClick={() => handleSelectSubcategory(sub, cat)}
                                  className={`flex items-center space-x-2 text-xs p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-200 dark:ring-indigo-900/50'
                                      : 'border-gray-100 dark:border-slate-700/60 hover:border-gray-200 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-800/70'
                                  }`}
                                >
                                  <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: color }}></div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-gray-800 dark:text-slate-100 font-semibold truncate block max-w-[110px]">{sub.name}</span>
                                    <span className="text-gray-400 dark:text-slate-400 text-[10px] font-medium block">₹{sub.allocatedBudget}</span>
                                  </div>
                                </button>
                              );
                            })}
                            {totalOverspent > 0 && (
                              <div className="flex items-center space-x-2 text-xs p-2 rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-bold">
                                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0 shadow-sm"></div>
                                <div>
                                  <span className="block text-[11px]">Total Overspent</span>
                                  <span className="text-red-600 dark:text-red-400 text-[10px] font-medium block">+₹{totalOverspent}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-slate-400 italic">No subcategories added yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editTxModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-100 dark:border-slate-800 transform scale-100 transition-all duration-200 animate-fadeIn">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Pencil className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-lg font-bold text-gray-900 dark:text-slate-100">Edit Transaction</h4>
              </div>
              <button
                onClick={() => setEditTxModal({ isOpen: false, id: null, amount: '', description: '', date: '', categoryId: '', subcategoryId: '', paymentMethod: 'UPI' })}
                className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 font-bold text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditTx} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Date</label>
                  <input
                    type="date"
                    required
                    disabled={isUpdatingTx}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editTxModal.date}
                    onChange={(e) => setEditTxModal({ ...editTxModal, date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    disabled={isUpdatingTx}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editTxModal.amount}
                    onChange={(e) => setEditTxModal({ ...editTxModal, amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Category</label>
                  <select
                    required
                    disabled={isUpdatingTx}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editTxModal.categoryId}
                    onChange={(e) => {
                      setEditTxModal({
                        ...editTxModal,
                        categoryId: e.target.value,
                        subcategoryId: ''
                      });
                    }}
                  >
                    <option value="" disabled>Select Category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Subcategory</label>
                  <select
                    required
                    disabled={!editTxModal.categoryId || isUpdatingTx}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:text-gray-400 dark:disabled:text-slate-500"
                    value={editTxModal.subcategoryId}
                    onChange={(e) => setEditTxModal({ ...editTxModal, subcategoryId: e.target.value })}
                  >
                    <option value="" disabled>Select Subcategory</option>
                    {categories.find(c => c._id === editTxModal.categoryId)?.subcategories?.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Payment Method</label>
                <select
                  disabled={isUpdatingTx}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editTxModal.paymentMethod}
                  onChange={(e) => setEditTxModal({ ...editTxModal, paymentMethod: e.target.value })}
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Cash">Cash</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Note / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Groceries"
                  disabled={isUpdatingTx}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editTxModal.description}
                  onChange={(e) => setEditTxModal({ ...editTxModal, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTxModal({ isOpen: false, id: null, amount: '', description: '', date: '', categoryId: '', subcategoryId: '', paymentMethod: 'UPI' })}
                  disabled={isUpdatingTx}
                  className="w-full py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 text-sm font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTx}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isUpdatingTx ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category / Subcategory Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-slate-800 transform scale-100 transition-all duration-200 animate-fadeIn">
            <div className="flex flex-col items-center text-center space-y-4 mb-5">
              <div className="p-4 bg-red-50 dark:bg-red-950/60 text-red-500 dark:text-red-400 rounded-2xl">
                <Trash2 className="h-7 w-7" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-950 dark:text-slate-100">
                  Delete {deleteConfirm.type === 'category' ? 'Category' : 'Subcategory'}?
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-slate-300 text-center mb-4">
              Are you sure you want to delete <span className="font-bold text-gray-800 dark:text-slate-100">"{deleteConfirm.name}"</span>?
            </p>

            {deleteConfirm.extra && (
              <div className="p-3 bg-red-50/70 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium mb-6">
                ⚠️ {deleteConfirm.extra}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, type: '', id: '', name: '', extra: '' })}
                className="w-full py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 text-sm font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
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

export default BudgetPlanning;
