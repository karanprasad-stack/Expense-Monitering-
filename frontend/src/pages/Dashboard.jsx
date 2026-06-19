import React, { useEffect, useState } from 'react';
import api from '../utils/axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Wallet, PiggyBank, TrendingDown, IndianRupee, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);

  const groupExpensesByDate = (expensesList) => {
    if (!expensesList) return {};
    const groups = {};
    expensesList.forEach(exp => {
      const dateStr = new Date(exp.date).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(exp);
    });
    return groups;
  };

  useEffect(() => {
    fetchDashboardData();
  }, [month, year]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/dashboard?month=${month}&year=${year}`);
      setData(res.data);
    } catch (error) {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
  };

  if (loading) return <div className="flex items-center justify-center h-[400px] text-gray-500 font-medium">Loading Dashboard Data...</div>;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 pt-20">
        <Wallet size={64} className="text-gray-300 mb-2" />
        <h2 className="text-2xl font-bold text-gray-700">No Budget Found</h2>
        <div className="flex space-x-4 mb-4">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-4 py-2 rounded-lg border border-gray-200">
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-4 py-2 rounded-lg border border-gray-200">
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <p className="text-center max-w-md">You haven't set up a budget for {new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year}. Head over to Budget Planning to get started!</p>
        <Link to="/planning" className="mt-4 px-6 py-3 bg-brand-500 text-white rounded-xl shadow-md hover:bg-brand-600 transition-all font-semibold">
          Create Budget
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Financial Dashboard</h2>
          <p className="text-sm text-gray-500">Summary for {new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year}</p>
        </div>
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

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Budget" 
          value={formatCurrency(data?.totalBudget)} 
          icon={<IndianRupee className="text-blue-500" />} 
          color="bg-blue-50" 
        />
        <StatCard 
          title="Allocated Budget" 
          value={formatCurrency(data?.allocatedAmount)} 
          icon={<Wallet className="text-indigo-500" />} 
          color="bg-indigo-50" 
          subtitle={`₹${data?.remainingBalance || 0} Unallocated`}
        />
        <StatCard 
          title="Total Spent" 
          value={formatCurrency(data?.totalSpent)} 
          icon={<TrendingDown className="text-red-500" />} 
          color="bg-red-50" 
          subtitle={data?.totalOverspent > 0 ? `⚠️ ₹${data.totalOverspent} Overspent` : 'Within Limits'}
          subtitleColor={data?.totalOverspent > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}
        />
        <StatCard 
          title="Net Savings" 
          value={formatCurrency(data?.savings)} 
          icon={<PiggyBank className="text-brand-500" />} 
          color="bg-brand-50" 
          subtitle={`${(((data?.savings || 0) / (data?.totalBudget || 1)) * 100).toFixed(0)}% of Budget`}
        />
      </div>

      {/* Overspent Alerts */}
      {data?.overspentSubcategories && data.overspentSubcategories.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-red-700 font-bold">
            <AlertTriangle className="h-5 w-5" />
            <h4 className="text-sm uppercase tracking-wider">Budget Exceeded Alert</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.overspentSubcategories.map(sub => (
              <div key={sub._id} className="bg-white p-3 rounded-xl border border-red-100 flex flex-col justify-between shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-gray-800 text-sm">{sub.name}</span>
                    <span className="block text-[10px] text-gray-400 font-medium">{sub.categoryName}</span>
                  </div>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    +₹{sub.over}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500 flex justify-between">
                  <span>Spent: ₹{sub.spent}</span>
                  <span>Budget: ₹{sub.allocated}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocated vs Spent Comparison */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Category Budget Comparison</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.categoryComparison || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip formatter={(value) => formatCurrency(value)} cursor={{fill: '#f3f4f6'}} />
                <Legend iconType="circle" />
                <Bar dataKey="allocated" name="Allocated Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" name="Actual Spent" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subcategory Spending Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Subcategory Spending Breakdown</h3>
            {data?.subcategorySpending && data.subcategorySpending.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.subcategorySpending}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {data.subcategorySpending.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-gray-400">
                <Wallet className="h-12 w-12 text-gray-200 mb-2" />
                <span className="text-sm italic">No expenses tracked yet this month.</span>
              </div>
            )}
          </div>
          {data?.subcategorySpending && data.subcategorySpending.length > 0 && (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2 pt-4 border-t border-gray-50">
              {data.subcategorySpending.map((entry, index) => (
                <div key={entry.name} className="flex items-center space-x-1.5 text-xs font-semibold">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-gray-700">{entry.name}</span>
                  <span className="text-gray-400">({formatCurrency(entry.value)})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Recent Expenses List */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Recent Transactions</h3>
          <button 
            onClick={() => setIsTransactionsModalOpen(true)}
            className="text-xs text-brand-600 font-bold flex items-center hover:underline space-x-1 cursor-pointer bg-none border-none"
          >
            <span>View All Transactions</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.recentExpenses && data.recentExpenses.map(exp => (
            <div key={exp._id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-between hover:bg-gray-100/50 transition-colors">
              <div>
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-gray-800 text-sm truncate max-w-[170px]">{exp.description}</span>
                  <span className="text-sm font-bold text-red-600 pl-2 whitespace-nowrap">- ₹{exp.amount}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 mt-2">
                  <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    {exp.categoryName}
                  </span>
                  <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    {exp.subcategoryName}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-gray-400 mt-3 flex justify-between items-center font-medium">
                <span>{new Date(exp.date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {(!data?.recentExpenses || data.recentExpenses.length === 0) && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400">
              <span className="text-4xl mb-2">💸</span>
              <p className="text-sm italic text-gray-500">No transactions recorded this month.</p>
            </div>
          )}
        </div>
      </div>

      {/* View All Transactions Modal */}
      {isTransactionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl max-w-2xl w-full h-[80vh] flex flex-col shadow-2xl border border-gray-100 transform scale-100 transition-all duration-200 animate-fadeIn">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-950">All Transactions</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Showing transactions for {new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year}
                </p>
              </div>
              <button 
                onClick={() => setIsTransactionsModalOpen(false)}
                className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-all font-bold text-sm"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {Object.keys(groupExpensesByDate(data?.allExpenses)).length > 0 ? (
                Object.entries(groupExpensesByDate(data?.allExpenses)).map(([dateStr, items]) => (
                  <div key={dateStr} className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider sticky top-0 bg-white py-1">
                      {dateStr}
                    </h4>
                    <div className="space-y-2">
                      {items.map(exp => (
                        <div key={exp._id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100/80 flex justify-between items-center hover:bg-gray-100/40 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-800 text-sm truncate">{exp.description}</p>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 mt-1.5">
                              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-bold text-[10px] uppercase tracking-wide">
                                {exp.categoryName}
                              </span>
                              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-bold text-[10px] uppercase tracking-wide">
                                {exp.subcategoryName}
                              </span>
                            </div>
                          </div>
                          <p className="font-extrabold text-red-600 text-sm pl-4 whitespace-nowrap">- ₹{exp.amount}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <span className="text-5xl mb-3">💸</span>
                  <p className="text-sm italic text-gray-500">No transactions recorded this month.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, color, subtitle, subtitleColor = 'text-gray-400' }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
    <div className={`p-4 rounded-xl ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-semibold">{title}</p>
      <h4 className="text-2xl font-bold text-gray-800 mt-1">{value}</h4>
      {subtitle && <p className={`text-[10px] mt-1 ${subtitleColor}`}>{subtitle}</p>}
    </div>
  </div>
);

export default Dashboard;
