import React, { useState, useContext } from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user } = useContext(AuthContext);
  const { theme, toggleTheme, isDark } = useContext(ThemeContext);
  const userName = user?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 relative transition-colors duration-200">
      {/* Mobile overlay backdrop with smooth fade */}
      <div
        className={`layout-backdrop ${isSidebarOpen ? 'layout-backdrop--visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
          <div className="flex items-center space-x-2">
            {/* Animated hamburger button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hamburger-btn"
              title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              aria-label="Toggle sidebar"
            >
              <span className={`hamburger-line hamburger-line--top ${isSidebarOpen ? 'hamburger-active' : ''}`} />
              <span className={`hamburger-line hamburger-line--mid ${isSidebarOpen ? 'hamburger-active' : ''}`} />
              <span className={`hamburger-line hamburger-line--bot ${isSidebarOpen ? 'hamburger-active' : ''}`} />
            </button>
            <h1 className="text-lg md:text-xl font-bold text-gray-800 dark:text-slate-100">Expense Tracker</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-amber-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all shadow-xs flex items-center justify-center cursor-pointer"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <Sun className="h-4 w-4 animate-fadeIn" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700 animate-fadeIn" />
              )}
            </button>

            <span className="text-sm font-semibold text-gray-700 dark:text-slate-200 hidden sm:inline">{userName}</span>
            <div className="h-9 w-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-brand-500/20">
              {userInitial}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-slate-950 p-4 md:p-6 transition-colors duration-200">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
