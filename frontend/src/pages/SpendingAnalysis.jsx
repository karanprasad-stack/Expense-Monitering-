import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/axios';
import {
  Search,
  Calendar,
  TrendingUp,
  Receipt,
  X,
  Loader2,
  AlertCircle,
  Tag,
  ArrowUpDown,
  Filter,
  Layers,
  Sparkles,
  ChevronDown,
  Check
} from 'lucide-react';

const SpendingAnalysis = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [dateRange, setDateRange] = useState('last-6-months');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');

  const dateRangeOptions = [
    { value: 'last-3-months', label: 'Last 3 Months' },
    { value: 'last-6-months', label: 'Last 6 Months' },
    { value: 'last-12-months', label: 'Last 12 Months' },
    { value: 'this-year', label: `This Year (${new Date().getFullYear()})` },
    { value: 'last-year', label: `Last Year (${new Date().getFullYear() - 1})` },
    { value: 'all-time', label: 'All Time' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const currentRangeLabel = dateRangeOptions.find(o => o.value === dateRange)?.label || 'All Time';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search term by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch analysis whenever query, range, or custom dates change
  useEffect(() => {
    fetchAnalysis();
  }, [debouncedQuery, dateRange, startDate, endDate]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (debouncedQuery) {
        params.append('q', debouncedQuery);
      }
      params.append('range', dateRange);

      if (dateRange === 'custom') {
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }

      const res = await api.get(`/expenses/analysis?${params.toString()}`);
      setAnalysisData(res.data);

      if (res.data.suggestions && res.data.suggestions.length > 0) {
        setSuggestions(res.data.suggestions);
      }
    } catch (err) {
      console.error('Error fetching spending analysis:', err);
      setError('Failed to load spending analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (keyword) => {
    setSearchTerm(keyword);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const defaultSuggestions = [
    'Electric Bill',
    'Grocery',
    'Chicken',
    'Egg',
    'Vegetables',
    'Paneer',
    'Onion & Potatoes',
    'Room Rent',
    'For Me',
    'Phone Recharge',
    'Electricity',
    'Aalu Piyaj'
  ];

  const displaySuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions;

  const monthsList = analysisData?.months || [];
  const maxMonthTotal = monthsList.length > 0
    ? Math.max(...monthsList.map(m => m.total), 1)
    : 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Spending Analysis</h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
            Search items, subcategories, or notes to compare your historical spending across months
          </p>
        </div>
      </div>

      {/* Search & Filter Card - TWO CONTROLS SIDE-BY-SIDE */}
      <div className="bg-[#0f172a] dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-row items-center gap-2 sm:gap-3 w-full">
          {/* Search Input Container - takes most available width */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search what you spend on (e.g. Cold Drink, Egg, Chicken, Petrol, Bread)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-9 py-2.5 sm:py-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 transition-all"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 z-10 p-1 flex items-center justify-center text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-700/80 cursor-pointer transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
          </div>

          {/* Date Range Dropdown - separate control with dark navy theme & fixed width */}
          <div className="relative flex-shrink-0 w-[125px] sm:w-[160px] md:w-[180px]" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(prev => !prev)}
              className="w-full px-2.5 sm:px-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 hover:border-slate-600 text-slate-100 font-medium text-xs sm:text-sm flex items-center justify-between gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
            >
              <span className="truncate">{currentRangeLabel}</span>
              <ChevronDown className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${isDropdownOpen ? 'rotate-180 text-indigo-400' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-44 sm:w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-40 animate-fadeIn overflow-hidden">
                {dateRangeOptions.map((opt) => {
                  const isSelected = dateRange === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setDateRange(opt.value);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-xs sm:text-sm transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-950/70 text-indigo-300 font-bold border-l-2 border-indigo-500'
                          : 'text-slate-200 hover:bg-slate-700/80 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400 ml-2 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Custom Date Range Pickers (only shown when custom range is selected) */}
        {dateRange === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 mt-3 border-t border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center space-x-3 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
            Searching transaction history across months...
          </p>
        </div>
      )}

      {/* Main Results Container */}
      {!loading && analysisData && (
        <>
          {debouncedQuery === '' ? (
            /* Second / Empty-State Card with Balanced Vertical Rhythm */
            <div className="bg-[#0f172a] dark:bg-slate-900 rounded-3xl pt-8 sm:pt-9 pb-10 sm:pb-12 px-6 sm:px-10 text-center border border-slate-800 shadow-sm">
              {/* Search Icon (28-36px from top, 24-28px to heading) */}
              <div className="p-3.5 bg-indigo-950/60 text-indigo-400 rounded-2xl w-fit mx-auto mb-6 sm:mb-7 border border-indigo-900/40">
                <Search className="h-7 w-7" />
              </div>

              {/* Heading */}
              <h3 className="text-lg sm:text-xl font-bold text-slate-100">
                Search what you spend money on
              </h3>

              {/* Common Items Section (28-32px from heading, 10-14px to buttons) */}
              <div className="mt-7 sm:mt-8 max-w-2xl mx-auto">
                <p className="text-xs font-semibold text-slate-400 mb-3 sm:mb-3.5">
                  Click a common item to get started:
                </p>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
                  {displaySuggestions.map((item, idx) => (
                    <button
                      key={`${item}-${idx}`}
                      type="button"
                      onClick={() => handleSuggestionClick(item)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-indigo-500 hover:text-indigo-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : monthsList.length === 0 ? (
            /* No Matches Found State */
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-gray-100 dark:border-slate-800 space-y-3 shadow-sm">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-3xl w-fit mx-auto">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                No transactions found for "{debouncedQuery}"
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                We couldn't find any expenses matching this keyword in the selected date range. Try searching another keyword or switch the date range to "All Time".
              </p>
              <div className="pt-2 flex justify-center space-x-3">
                {dateRange !== 'all-time' && (
                  <button
                    type="button"
                    onClick={() => setDateRange('all-time')}
                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-950 transition-all cursor-pointer"
                  >
                    Search All Time
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Clear Search
                </button>
              </div>
            </div>
          ) : (
            /* Matches Found View */
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                    Total Spent
                  </p>
                  <p className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                    ₹{analysisData.overallTotal.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                    For "{debouncedQuery}"
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                    Transactions
                  </p>
                  <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-slate-100 mt-1">
                    {analysisData.overallCount}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                    Matching records
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                    Months Tracked
                  </p>
                  <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-slate-100 mt-1">
                    {analysisData.monthsTracked}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                    Active months
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                    Monthly Average
                  </p>
                  <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    ₹{analysisData.averageMonthlySpent.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                    Per active month
                  </p>
                </div>
              </div>

              {/* Monthly Visual Comparison Bars */}
              {monthsList.length > 1 && (
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                      Monthly Spending Intensity
                    </span>
                    <span className="text-[11px] font-medium text-gray-400 dark:text-slate-500">
                      Comparing {monthsList.length} months
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {monthsList.map((m) => {
                      const percent = Math.round((m.total / maxMonthTotal) * 100);
                      return (
                        <div key={`bar-${m.monthKey}`} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-800 dark:text-slate-200">
                              {m.monthLabel}
                            </span>
                            <span className="font-bold text-gray-900 dark:text-slate-100">
                              ₹{m.total.toLocaleString('en-IN')}{' '}
                              <span className="text-[10px] text-gray-400 font-normal">
                                ({m.count} tx)
                              </span>
                            </span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(percent, 4)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Month-by-Month Transaction History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">
                    Month-by-Month Breakdown
                  </h3>
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                    Chronological order (Newest first)
                  </span>
                </div>

                {monthsList.map((m) => (
                  <div
                    key={m.monthKey}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs overflow-hidden"
                  >
                    {/* Month Header Banner */}
                    <div className="bg-gray-50/90 dark:bg-slate-800/80 px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wide">
                          {m.monthLabel}
                        </h4>
                        <span className="text-[11px] bg-gray-200/70 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-semibold px-2 py-0.5 rounded-full">
                          {m.count} {m.count === 1 ? 'tx' : 'txs'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                          Monthly Total:
                        </span>
                        <span className="text-base sm:text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                          ₹{m.total.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Table of Transactions in this Month */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <th className="py-2.5 px-4 sm:px-6">Date</th>
                            <th className="py-2.5 pr-4">Description</th>
                            <th className="py-2.5 pr-4">Category / Subcategory</th>
                            <th className="py-2.5 pr-4">Method</th>
                            <th className="py-2.5 pr-4 text-center">Match</th>
                            <th className="py-2.5 px-4 sm:px-6 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800/60">
                          {m.transactions.map((tx) => {
                            const dateFormatted = new Date(tx.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            });

                            return (
                              <tr
                                key={tx._id}
                                className="hover:bg-slate-50/70 dark:hover:bg-[#18243a]/70 transition-colors"
                              >
                                {/* Date */}
                                <td className="py-3 px-4 sm:px-6 text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                                  {dateFormatted}
                                </td>

                                {/* Description */}
                                <td className="py-3 pr-4">
                                  <span
                                    className="font-semibold text-gray-900 dark:text-slate-100 block max-w-[220px] truncate"
                                    title={tx.description || 'General'}
                                  >
                                    {tx.description || 'General'}
                                  </span>
                                </td>

                                {/* Category / Subcategory Tags */}
                                <td className="py-3 pr-4">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide">
                                      {tx.catName || 'Unknown'}
                                    </span>
                                    <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide">
                                      {tx.subName || 'Unknown'}
                                    </span>
                                  </div>
                                </td>

                                {/* Payment Method */}
                                <td className="py-3 pr-4 text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                                  <span className="text-[11px] bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200/60 dark:border-slate-700 px-2 py-0.5 rounded-full font-medium">
                                    {tx.paymentMethod || 'UPI'}
                                  </span>
                                </td>

                                {/* Match Origin Badge */}
                                <td className="py-3 pr-4 text-center whitespace-nowrap">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                      tx.matchType === 'subcategory'
                                        ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50'
                                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                                    }`}
                                  >
                                    {tx.matchType === 'subcategory' ? 'Sub-category' : 'Description'}
                                  </span>
                                </td>

                                {/* Amount */}
                                <td className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">
                                  <span className="font-extrabold text-sm text-gray-900 dark:text-slate-100">
                                    ₹{tx.amount.toLocaleString('en-IN')}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              {/* Overall Total Sticky / Footer Banner */}
              <div className="bg-indigo-900 dark:bg-indigo-950 text-white p-4 sm:p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-800 dark:bg-indigo-900 rounded-xl">
                    <TrendingUp className="h-5 w-5 text-indigo-200" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-200">
                      Overall Total Spent
                    </h4>
                    <p className="text-xs text-indigo-300">
                      Calculated from all {analysisData.overallCount} matching transactions across {analysisData.monthsTracked} active months
                    </p>
                  </div>
                </div>

                <div className="text-center sm:text-right">
                  <div className="text-2xl sm:text-3xl font-black text-white">
                    ₹{analysisData.overallTotal.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SpendingAnalysis;
