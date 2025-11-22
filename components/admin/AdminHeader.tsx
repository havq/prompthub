import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';

interface AdminHeaderProps {
  setSidebarOpen: (open: boolean) => void;
  activeTabTitle: string;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ setSidebarOpen, activeTabTitle }) => {
  const { userProfile, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button type="button" className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden" onClick={() => setSidebarOpen(true)}>
        <span className="sr-only">Open sidebar</span>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
      </button>

      {/* Separator for mobile */}
      <div className="h-6 w-px bg-gray-900/10 dark:bg-white/5 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center flex-1">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{activeTabTitle}</h1>
        </div>
        
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <Link to="/" className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
            View Site
          </Link>
          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10 dark:lg:bg-white/5" aria-hidden="true" />

          {/* Profile dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="-m-1.5 flex items-center p-1.5" aria-expanded={isUserMenuOpen} aria-haspopup="true">
              <span className="sr-only">Open user menu</span>
              <img
                className="h-8 w-8 rounded-full bg-gray-50 object-cover"
                src={userProfile?.photoURL ? transformCloudinaryUrl(userProfile.photoURL, 'w_64,h_64,c_fill,g_auto') : `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userProfile?.username || 'A')}`}
                alt=""
              />
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-gray-900 dark:text-white" aria-hidden="true">{userProfile?.username}</span>
                <svg className="ml-2 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </span>
            </button>
            {isUserMenuOpen && (
              <div className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none" role="menu" aria-orientation="vertical">
                <Link to="/profile" onClick={() => setIsUserMenuOpen(false)} className="block px-3 py-1 text-sm leading-6 text-gray-900 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700" role="menuitem">Your Public Profile</Link>
                <button onClick={logout} className="w-full text-left block px-3 py-1 text-sm leading-6 text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700" role="menuitem">Sign out</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
