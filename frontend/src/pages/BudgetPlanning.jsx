import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const BudgetPlanning = () => {
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

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: '', id: '', name: '' });
  const [errorMessage, setErrorMessage] = useState('');

  const handleUpdateBudget = async (e) => {
    e.preventDefault();
    try {
      await api.post('/budgets', { month, year, totalBudget: Number(editingBudgetAmount) });
      setIsEditingBudget(false);
      fetchBudgetAndCategories();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.error(msg);
      showError('Error updating budget: ' + msg);
    }
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const handleUpdateCategory = async (catId) => {
    if (!editingCategoryName.trim()) return;
    try {
      await api.put(`/categories/${catId}`, { name: editingCategoryName });
      setEditingCategoryId(null);
      setEditingCategoryName('');
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
      name: catName
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
      fetchBudgetAndCategories();
    } catch (error) {
      console.error(error);
      showError('Error updating subcategory');
    }
  };

  const handleDeleteSubcategoryClick = (subId, subName) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'subcategory',
      id: subId,
      name: subName
    });
  };

  const confirmDelete = async () => {
    const { type, id } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, type: '', id: '', name: '' });
    try {
      if (type === 'category') {
        await api.delete(`/categories/${id}`);
      } else if (type === 'subcategory') {
        await api.delete(`/categories/subcategories/${id}`);
      }
      fetchBudgetAndCategories();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || error.message;
      showError(`Error deleting ${type}: ${msg}`);
    }
  };

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
    } catch (error) {
      setBudget(null);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const createBudget = async (e) => {
    e.preventDefault();
    try {
      await api.post('/budgets', { month, year, totalBudget: Number(totalBudgetInput) });
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
      fetchBudgetAndCategories();
    } catch (error) {
      console.error(error);
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
      fetchBudgetAndCategories();
    } catch (error) {
      console.error(error);
    }
  };



  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {errorMessage && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center space-x-3 text-red-700 animate-pulse">
          <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-semibold">{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="ml-auto text-red-400 hover:text-red-600 font-bold text-xs">
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Budget Planning</h2>
        <div className="flex space-x-3 sm:space-x-4">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="flex-1 sm:flex-initial px-4 py-2 rounded-lg border border-gray-200 bg-white">
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="flex-1 sm:flex-initial px-4 py-2 rounded-lg border border-gray-200 bg-white">
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {!budget ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold mb-4">Create Budget for this Month</h3>
          <form onSubmit={createBudget} className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Budget Amount (₹)</label>
              <input
                type="number"
                required
                className="w-full px-4 py-2 rounded-xl border border-gray-200"
                value={totalBudgetInput}
                onChange={(e) => setTotalBudgetInput(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full sm:w-auto px-6 py-2 bg-brand-500 text-white rounded-xl shadow-md hover:bg-brand-600 transition-all h-[42px] font-semibold">
              Set Budget
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Total Budget</p>
                  {isEditingBudget ? (
                    <form onSubmit={handleUpdateBudget} className="mt-2 flex items-center space-x-2 w-full">
                      <input
                        type="number"
                        required
                        className="w-full max-w-[120px] px-2 py-1 text-base rounded-lg border border-gray-200 focus:outline-none focus:border-brand-500"
                        value={editingBudgetAmount}
                        onChange={(e) => setEditingBudgetAmount(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="px-2 py-1 bg-brand-500 text-white rounded hover:bg-brand-600 text-xs font-semibold transition-all">
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingBudget(false)}
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs font-semibold transition-all"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <p className="text-2xl font-bold">₹{budget.totalBudget}</p>
                  )}
                </div>
                {!isEditingBudget && (
                  <button
                    onClick={() => {
                      setEditingBudgetAmount(budget.totalBudget);
                      setIsEditingBudget(true);
                    }}
                    className="p-1 text-gray-400 hover:text-brand-500 transition-colors text-xs font-semibold"
                    title="Edit Budget"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100">
              <p className="text-sm text-gray-500">Allocated</p>
              <p className="text-2xl font-bold">₹{budget.allocatedAmount}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
              <p className="text-sm text-gray-500">Unallocated</p>
              <p className="text-2xl font-bold">₹{budget.remainingAmount}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-4">Add Category</h3>
            <form onSubmit={createCategory} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="text"
                placeholder="e.g. Monthly Expenses"
                required
                className="w-full sm:flex-1 px-4 py-2 rounded-xl border border-gray-200"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
              <button type="submit" className="w-full sm:w-auto px-6 py-2 bg-brand-500 text-white rounded-xl shadow-md hover:bg-brand-600 transition-all font-semibold">
                Add
              </button>
            </form>
          </div>

          {categories.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold mb-4">Add Subcategory</h3>
              <form onSubmit={createSubcategory} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <select
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white"
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                >
                  <option value="" disabled>Select Category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Name (optional, e.g. Groceries)"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200"
                  value={newSubcatName}
                  onChange={(e) => setNewSubcatName(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Amount (₹)"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200"
                  value={newSubcatAmount}
                  onChange={(e) => setNewSubcatAmount(e.target.value)}
                />
                <button type="submit" className="w-full px-6 py-2 bg-brand-500 text-white rounded-xl shadow-md hover:bg-brand-600 transition-all font-semibold">
                  Add Subcategory
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {categories.map(cat => {
              const totalOverspent = cat.subcategories ? cat.subcategories.reduce((acc, sub) => {
                const over = sub.spentAmount - sub.allocatedBudget;
                return acc + (over > 0 ? over : 0);
              }, 0) : 0;
              return (
                <div key={cat._id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b">
                    {editingCategoryId === cat._id ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                        <input
                          type="text"
                          required
                          className="flex-1 px-3 py-1.5 text-base rounded-lg border border-gray-200 focus:outline-none focus:border-brand-500"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          autoFocus
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateCategory(cat._id)}
                            className="flex-1 sm:flex-initial px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm font-semibold transition-all shadow-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingCategoryId(null);
                              setEditingCategoryName('');
                            }}
                            className="flex-1 sm:flex-initial px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-semibold transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-lg font-bold text-gray-800">{cat.name}</h4>
                        <div className="flex items-center space-x-2 self-end sm:self-auto">
                          <button
                            onClick={() => {
                              setEditingCategoryId(cat._id);
                              setEditingCategoryName(cat.name);
                            }}
                            className="text-gray-400 hover:text-brand-500 text-sm p-1 transition-colors font-medium"
                            title="Edit Category"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategoryClick(cat._id, cat.name)}
                            className="text-gray-400 hover:text-red-500 text-sm p-1 transition-colors font-medium"
                            title="Delete Category"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                {cat.subcategories && cat.subcategories.length > 0 ? (
                  <div className="space-y-6">
                    {/* Left Column: Subcategory Small Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {cat.subcategories.map(sub => {
                        const actualPercent = sub.allocatedBudget > 0 ? (sub.spentAmount / sub.allocatedBudget) * 100 : 0;
                        const isOverspent = sub.spentAmount > sub.allocatedBudget;
                        const isWarning = !isOverspent && actualPercent >= 70;
                        const isSafe = !isOverspent && !isWarning;
                        const percent = Math.min(actualPercent, 100);

                        const isEditing = editingSubcategoryId === sub._id;
                        const hoverBorderClass = isOverspent ? 'hover:border-red-500' : isWarning ? 'hover:border-orange-500' : 'hover:border-brand-500';

                        return (
                          <div key={sub._id} className={`p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between group hover:z-10 hover:shadow-md hover:bg-white min-h-[110px] relative transition-all duration-200 ${hoverBorderClass}`}>
                            {isEditing ? (
                              <div className="space-y-2 w-full">
                                <input
                                  type="text"
                                  required
                                  className="w-full px-3 py-1 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-500"
                                  placeholder="Subcategory Name"
                                  value={editingSubcategoryName}
                                  onChange={(e) => setEditingSubcategoryName(e.target.value)}
                                  autoFocus
                                />
                                <input
                                  type="number"
                                  required
                                  className="w-full px-3 py-1 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-500"
                                  placeholder="Budget (₹)"
                                  value={editingSubcategoryAmount}
                                  onChange={(e) => setEditingSubcategoryAmount(e.target.value)}
                                />
                                <div className="flex space-x-2 justify-end">
                                  <button
                                    onClick={() => handleUpdateSubcategory(sub._id)}
                                    className="px-2.5 py-1 bg-brand-500 text-white text-xs rounded-lg hover:bg-brand-600 font-semibold transition-all shadow-sm"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingSubcategoryId(null);
                                      setEditingSubcategoryName('');
                                      setEditingSubcategoryAmount('');
                                    }}
                                    className="px-2.5 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 font-semibold transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="min-w-0 flex-1 pr-2 flex flex-col justify-between h-full space-y-2">
                                  <div className="flex justify-between items-start w-full">
                                    <span className="font-bold text-gray-800 truncate block text-sm">{sub.name}</span>
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                      <button
                                        onClick={() => {
                                          setEditingSubcategoryId(sub._id);
                                          setEditingSubcategoryName(sub.name);
                                          setEditingSubcategoryAmount(sub.allocatedBudget);
                                        }}
                                        className="text-gray-400 hover:text-brand-500 text-xs p-0.5 transition-colors font-bold"
                                        title="Edit"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSubcategoryClick(sub._id, sub.name)}
                                        className="text-gray-400 hover:text-red-500 text-xs p-0.5 transition-colors font-bold"
                                        title="Delete"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500 font-medium">
                                      Spent ₹{sub.spentAmount} of ₹{sub.allocatedBudget}
                                    </div>
                                    {sub.spentAmount > sub.allocatedBudget && (
                                      <div className="text-[10px] font-bold text-red-600 mt-1 flex items-center">
                                        ⚠️ Over budget by ₹{sub.spentAmount - sub.allocatedBudget}
                                      </div>
                                    )}
                                    <div className="text-[10px] font-bold mt-1" style={{ color: isOverspent ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981' }}>
                                      {actualPercent.toFixed(0)}% Utilized
                                    </div>
                                  </div>
                                </div>
                                <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center relative">
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
                                        innerRadius={10}
                                        outerRadius={22}
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
                                            return <Cell key="remaining" fill="#d1d5db" />;
                                          });
                                        })()}
                                      </Pie>
                                      <Tooltip 
                                        formatter={(value) => `₹${value}`} 
                                        contentStyle={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                                        itemStyle={{ color: '#1f2937' }}
                                      />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Subcategory Allocation Breakdown and Color Legend at the bottom */}
                    <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-6">
                      {/* Allocation Chart */}
                      <div className="w-full md:w-44 h-36 flex-shrink-0 flex items-center justify-center bg-gray-50 rounded-xl p-2 border border-gray-100 self-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                ...cat.subcategories.map(sub => ({
                                  name: sub.name,
                                  value: sub.allocatedBudget || 0,
                                  isOverspent: false
                                })),
                                ...(totalOverspent > 0 ? [{
                                  name: 'Total Overspent',
                                  value: totalOverspent,
                                  isOverspent: true
                                }] : [])
                              ].filter(item => item.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={25}
                              outerRadius={40}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {(() => {
                                const chartData = [
                                  ...cat.subcategories.map(sub => ({
                                    name: sub.name,
                                    value: sub.allocatedBudget || 0,
                                    isOverspent: false
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
                                  return <Cell key={`cell-${idx}`} fill={color} />;
                                });
                              })()}
                            </Pie>
                             <Tooltip 
                               formatter={(value) => `₹${value}`} 
                               contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                               itemStyle={{ color: '#1f2937' }}
                             />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Legend Explaining Colors */}
                      <div className="flex-1 w-full">
                        <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Subcategory Allocation Breakdown</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {cat.subcategories.map((sub, idx) => {
                            const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];
                            const color = COLORS[idx % COLORS.length];
                            return (
                              <div key={sub._id} className="flex items-center space-x-2 text-xs">
                                <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: color }}></div>
                                <span className="text-gray-700 font-semibold truncate max-w-[120px]">{sub.name}</span>
                                <span className="text-gray-400 font-medium">(₹{sub.allocatedBudget})</span>
                              </div>
                            );
                          })}
                          {totalOverspent > 0 && (
                            <div className="flex items-center space-x-2 text-xs font-bold text-red-600">
                              <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0 shadow-sm"></div>
                              <span>Total Overspent</span>
                              <span className="text-red-500 font-medium">(₹{totalOverspent})</span>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No subcategories added yet.</p>
                )}
              </div>
            );
          })}
        </div>



        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 transform scale-100 transition-all duration-200">
            <div className="flex flex-col items-center text-center space-y-4 mb-6">
              <div className="p-4 bg-red-50 text-red-500 rounded-2xl">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-950">Delete {deleteConfirm.type === 'category' ? 'Category' : 'Subcategory'}?</h4>
                <p className="text-xs text-gray-500 mt-1">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 text-center mb-6">
              Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteConfirm.name}"</span>?
              {deleteConfirm.type === 'category' && " This will also delete all of its subcategories and associated transactions."}
              {deleteConfirm.type === 'subcategory' && " This will also delete all associated transactions."}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, type: '', id: '', name: '' })}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="w-full py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-semibold transition-all shadow-md shadow-red-100"
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
