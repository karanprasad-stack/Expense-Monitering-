import React, { useEffect, useState, useContext } from 'react';
import api from '../utils/axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Wallet, PiggyBank, TrendingDown, IndianRupee, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
  const { isDark } = useContext(ThemeContext);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-500 dark:text-slate-400 font-medium">
        Loading Dashboard Data...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-slate-400 space-y-4 pt-20">
        <Wallet size={64} className="text-gray-300 dark:text-slate-600 mb-2" />
        <h2 className="text-2xl font-bold text-gray-700 dark:text-slate-200">No Budget Found</h2>
        <div className="flex space-x-4 mb-4">
          <select 
            value={month} 
            onChange={(e) => setMonth(Number(e.target.value))} 
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium"
          >
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))} 
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <p className="text-center max-w-md text-gray-600 dark:text-slate-300">
          You haven't set up a budget for {new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year}. Head over to Budget Planning to get started!
        </p>
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
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Financial Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Summary for {new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year}</p>
        </div>
        <div className="flex space-x-3 sm:space-x-4">
          <select 
            value={month} 
            onChange={(e) => setMonth(Number(e.target.value))} 
            className="flex-1 sm:flex-initial px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium shadow-xs focus:ring-2 focus:ring-brand-500 outline-none"
          >
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))} 
            className="flex-1 sm:flex-initial px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium shadow-xs focus:ring-2 focus:ring-brand-500 outline-none"
          >
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
          color="bg-blue-50 dark:bg-blue-950/50" 
        />
        <StatCard 
          title="Allocated Budget" 
          value={formatCurrency(data?.allocatedAmount)} 
          icon={<Wallet className="text-indigo-500" />} 
          color="bg-indigo-50 dark:bg-indigo-950/50" 
          subtitle={`₹${data?.remainingBalance || 0} Unallocated`}
        />
        <StatCard 
          title="Total Spent" 
          value={formatCurrency(data?.totalSpent)} 
          icon={<TrendingDown className="text-red-500" />} 
          color="bg-red-50 dark:bg-red-950/50" 
          subtitle={data?.totalOverspent > 0 ? `⚠️ ₹${data.totalOverspent} Overspent` : 'Within Limits'}
          subtitleColor={data?.totalOverspent > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-400 dark:text-slate-400'}
        />
        <StatCard 
          title="Net Savings" 
          value={formatCurrency(data?.savings)} 
          icon={<PiggyBank className="text-brand-500" />} 
          color="bg-brand-50 dark:bg-emerald-950/50" 
          subtitle={`${(((data?.savings || 0) / (data?.totalBudget || 1)) * 100).toFixed(0)}% of Budget`}
        />
      </div>

      {/* Overspent Alerts */}
      {data?.overspentSubcategories && data.overspentSubcategories.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-red-700 dark:text-red-400 font-bold">
            <AlertTriangle className="h-5 w-5" />
            <h4 className="text-sm uppercase tracking-wider">Budget Exceeded Alert</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.overspentSubcategories.map(sub => (
              <div key={sub._id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-red-100 dark:border-red-900/40 flex flex-col justify-between shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-gray-800 dark:text-slate-100 text-sm">{sub.name}</span>
                    <span className="block text-[10px] text-gray-400 dark:text-slate-400 font-medium">{sub.categoryName}</span>
                  </div>
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-full">
                    +₹{sub.over}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-slate-400 flex justify-between">
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
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4">Category Budget Comparison</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.categoryComparison || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e5e7eb'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} stroke={isDark ? '#94a3b8' : '#6b7280'} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} stroke={isDark ? '#94a3b8' : '#6b7280'} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)} 
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e5e7eb',
                    borderRadius: '12px',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                  }}
                  itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                  cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f3f4f6' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ color: isDark ? '#cbd5e1' : '#4b5563' }} />
                <Bar dataKey="allocated" name="Allocated Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" name="Actual Spent" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subcategory Spending Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4">Subcategory Spending Breakdown</h3>
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
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#e5e7eb',
                        borderRadius: '12px',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                      }}
                      itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
                <Wallet className="h-12 w-12 text-gray-200 dark:text-slate-700 mb-2" />
                <span className="text-sm italic">No expenses tracked yet this month.</span>
              </div>
            )}
          </div>
          {data?.subcategorySpending && data.subcategorySpending.length > 0 && (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2 pt-4 border-t border-gray-50 dark:border-slate-800">
              {data.subcategorySpending.map((entry, index) => (
                <div key={entry.name} className="flex items-center space-x-1.5 text-xs font-semibold">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-gray-700 dark:text-slate-200">{entry.name}</span>
                  <span className="text-gray-400 dark:text-slate-400">({formatCurrency(entry.value)})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Recent Expenses List */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">Recent Transactions</h3>
          <button 
            onClick={() => setIsTransactionsModalOpen(true)}
            className="text-xs text-brand-600 dark:text-brand-400 font-bold flex items-center hover:underline space-x-1 cursor-pointer bg-none border-none"
          >
            <span>View All Transactions</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.recentExpenses && data.recentExpenses.map(exp => (
            <div key={exp._id} className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-700/60 flex flex-col justify-between hover:bg-gray-100/50 dark:hover:bg-slate-800 transition-colors">
              <div>
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-gray-800 dark:text-slate-100 text-sm truncate max-w-[150px]">{exp.description}</span>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400 pl-2 whitespace-nowrap">- ₹{exp.amount}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 dark:text-slate-400 mt-2">
                  <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    {exp.categoryName}
                  </span>
                  <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    {exp.subcategoryName}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-gray-400 dark:text-slate-400 mt-3 font-medium">
                <span>{new Date(exp.date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {(!data?.recentExpenses || data.recentExpenses.length === 0) && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
              <span className="text-4xl mb-2">💸</span>
              <p className="text-sm italic text-gray-500 dark:text-slate-400">No transactions recorded this month.</p>
            </div>
          )}
        </div>
      </div>

      {/* View All Transactions Modal */}
      {isTransactionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full h-[80vh] flex flex-col shadow-2xl border border-gray-100 dark:border-slate-800 transform scale-100 transition-all duration-200 animate-fadeIn">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-950 dark:text-slate-100">All Transactions</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Showing transactions for {new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year}
                </p>
              </div>
              <button 
                onClick={() => setIsTransactionsModalOpen(false)}
                className="p-2 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-xl transition-all font-bold text-sm cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {Object.keys(groupExpensesByDate(data?.allExpenses)).length > 0 ? (
                Object.entries(groupExpensesByDate(data?.allExpenses)).map(([dateStr, items]) => (
                  <div key={dateStr} className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-900 py-1">
                      {dateStr}
                    </h4>
                    <div className="space-y-2">
                      {items.map(exp => (
                        <div key={exp._id} className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100/80 dark:border-slate-700/60 flex justify-between items-center hover:bg-gray-100/40 dark:hover:bg-slate-800 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-800 dark:text-slate-100 text-sm truncate">{exp.description}</p>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 mt-1.5">
                              <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg font-bold text-[10px] uppercase tracking-wide">
                                {exp.categoryName}
                              </span>
                              <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded-lg font-bold text-[10px] uppercase tracking-wide">
                                {exp.subcategoryName}
                              </span>
                            </div>
                          </div>
                          <div className="pl-4">
                            <p className="font-extrabold text-red-600 dark:text-red-400 text-sm whitespace-nowrap">- ₹{exp.amount}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 py-12">
                  <span className="text-5xl mb-3">💸</span>
                  <p className="text-sm italic text-gray-500 dark:text-slate-400">No transactions recorded this month.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, color, subtitle, subtitleColor = 'text-gray-400 dark:text-slate-400' }) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center space-x-4">
    <div className={`p-4 rounded-xl ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-slate-400 font-semibold">{title}</p>
      <h4 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mt-1">{value}</h4>
      {subtitle && <p className={`text-[10px] mt-1 ${subtitleColor}`}>{subtitle}</p>}
    </div>
  </div>
);

export default Dashboard;

