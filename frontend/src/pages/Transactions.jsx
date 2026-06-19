import React, { useState, useEffect } from 'react';
import api from '../utils/axios';

const Transactions = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Expense form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [warning, setWarning] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const d = new Date();
      const budgetRes = await api.get(`/budgets?month=${d.getMonth()+1}&year=${d.getFullYear()}`);
      if (budgetRes.data) {
        const catRes = await api.get(`/categories?budgetId=${budgetRes.data._id}`);
        setCategories(catRes.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setWarning('');
    try {
      const res = await api.post('/expenses', {
        amount: Number(amount),
        description,
        date,
        categoryId,
        subcategoryId
      });
      if (res.data.warning) {
        setWarning(res.data.warning);
      }
      // Reset form
      setAmount('');
      setDescription('');
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const selectedCat = categories.find(c => c._id === categoryId);
  const subcategories = selectedCat ? selectedCat.subcategories : [];

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Transactions</h2>

      {warning && (
        <div className="p-4 bg-red-100 border border-red-200 text-red-700 rounded-xl flex items-center space-x-2">
          <span>🔴</span>
          <span className="font-bold">{warning}</span>
        </div>
      )}

      {/* Add Expense Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-4">Record New Expense</h3>
        <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="date"
            required
            className="px-4 py-2 rounded-xl border border-gray-200"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <select
            required
            className="px-4 py-2 rounded-xl border border-gray-200"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubcategoryId('');
            }}
          >
            <option value="" disabled>Select Category</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select
            required
            className="px-4 py-2 rounded-xl border border-gray-200"
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            disabled={!categoryId}
          >
            <option value="" disabled>Select Subcategory</option>
            {subcategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <input
            type="number"
            placeholder="Amount (₹)"
            required
            className="px-4 py-2 rounded-xl border border-gray-200"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            className="px-4 py-2 rounded-xl border border-gray-200 md:col-span-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button type="submit" className="md:col-span-3 px-6 py-3 bg-brand-500 text-white rounded-xl shadow-md hover:bg-brand-600 transition-all font-semibold mt-2">
            Add Expense
          </button>
        </form>
      </div>


    </div>
  );
};

export default Transactions;
