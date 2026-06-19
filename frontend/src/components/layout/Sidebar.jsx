import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PieChart, Receipt, LogOut } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import clsx from 'clsx';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const { logout } = useContext(AuthContext);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Transactions', path: '/transactions', icon: Receipt },
    { name: 'Budget Planning', path: '/planning', icon: PieChart },
  ];

  const handleItemClick = () => {
    if (window.innerWidth < 768 && setIsOpen) {
      setIsOpen(false);
    }
  };

  const handleLogoutClick = () => {
    logout();
    handleItemClick();
  };

  return (
    <aside
      className={clsx(
        "sidebar-root",
        isOpen ? "sidebar-open" : "sidebar-closed"
      )}
    >
      {/* Logo area */}
      <div className={clsx("sidebar-header", isOpen ? "justify-between" : "justify-center")}>
        <h2 className="sidebar-logo">
          {isOpen ? "FinTrack" : "FT"}
        </h2>
        {isOpen && (
          <button
            onClick={() => setIsOpen(false)}
            className="sidebar-close-btn md:hidden"
            title="Close Sidebar"
          >
            ✕
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={handleItemClick}
              className={clsx(
                'sidebar-nav-item',
                isOpen ? 'sidebar-nav-item--expanded' : 'sidebar-nav-item--collapsed',
                isActive
                  ? 'sidebar-nav-item--active'
                  : 'sidebar-nav-item--inactive'
              )}
              title={!isOpen ? item.name : undefined}
            >
              <Icon size={20} className={clsx("sidebar-nav-icon", isActive && "sidebar-nav-icon--active")} />
              <span className={clsx("sidebar-nav-label", !isOpen && "sidebar-nav-label--hidden")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="sidebar-footer">
        <button
          onClick={handleLogoutClick}
          className={clsx(
            "sidebar-logout-btn",
            isOpen ? "sidebar-nav-item--expanded" : "sidebar-nav-item--collapsed"
          )}
          title={!isOpen ? "Logout" : undefined}
        >
          <LogOut size={20} />
          <span className={clsx("sidebar-nav-label", !isOpen && "sidebar-nav-label--hidden")}>
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
