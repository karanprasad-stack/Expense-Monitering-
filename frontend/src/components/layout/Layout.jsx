import React, { useState, useContext } from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user } = useContext(AuthContext);
  const userName = user?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 relative">
      {/* Mobile overlay backdrop with smooth fade */}
      <div
        className={`layout-backdrop ${isSidebarOpen ? 'layout-backdrop--visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 bg-white border-b border-gray-200 shadow-sm">
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
            <h1 className="text-lg md:text-xl font-bold text-gray-800">Budget Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">{userName}</span>
            <div className="h-9 w-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-brand-500/20">
              {userInitial}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
