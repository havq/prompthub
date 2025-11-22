import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSettings } from '../../services/settingsService';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSwitcher from '../LanguageSwitcher';
import NotificationPopover from '../NotificationPopover';
import { AppSettings, NavigationLink } from '../../types';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import { buildUrl } from '../../utils/permalinks';

interface TreeItem extends NavigationLink {
  children: TreeItem[];
}

const buildTree = (items: NavigationLink[], parentId: string | null = null): TreeItem[] => {
    return items
        .filter(item => (item.parentId || null) === parentId)
        .sort((a, b) => a.order - b.order)
        .map(item => ({
            ...item,
            children: buildTree(items, item.id)
        }));
};

const getFinalPath = (item: NavigationLink): string => {
    if (item.linkType === 'category' && item.linkedId) return buildUrl('promptCategory', { categoryId: item.linkedId });
    if (item.linkType === 'post-category' && item.linkedId) return buildUrl('postCategory', { categoryId: item.linkedId });
    return item.path;
};

const HeaderStyle3: React.FC<{ isNotificationBarVisible?: boolean }> = ({ isNotificationBarVisible = false }) => {
  const { currentUser, userProfile, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [logos, setLogos] = useState(() => ({ light: settings.appLogoLight, dark: settings.appLogoDark }));
  const [menuItems, setMenuItems] = useState(() => settings.navigationMenu || []);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  
  const displayedLogo = theme === 'dark' ? (logos.dark || logos.light) : logos.light;

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const isBarAtTop = isNotificationBarVisible && settings.notificationBarSettings?.position !== 'bottom';
  const topClass = isBarAtTop ? 'top-12' : 'top-0';

  const controlHeader = useCallback(() => {
      const scrollThreshold = 100;
      if (typeof window !== 'undefined') {
          if (window.scrollY > lastScrollY && window.scrollY > scrollThreshold) {
              setIsVisible(false);
          } else {
              setIsVisible(true);
          }
          setLastScrollY(window.scrollY);
      }
  }, [lastScrollY]);

  useEffect(() => {
      if (typeof window !== 'undefined') {
          window.addEventListener('scroll', controlHeader, { passive: true });
          return () => {
              window.removeEventListener('scroll', controlHeader);
          };
      }
  }, [controlHeader]);

  useEffect(() => {
    const handleSettingsChange = () => {
        const newSettings = getSettings();
        setSettings(newSettings);
        setLogos({ light: newSettings.appLogoLight, dark: newSettings.appLogoDark });
        setMenuItems(newSettings.navigationMenu || []);
    };
    window.addEventListener('storage', handleSettingsChange);
    return () => window.removeEventListener('storage', handleSettingsChange);
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuTree = useMemo(() => {
    const filtered = menuItems.filter(item => {
        if (item.requiresAuth && !currentUser) return false;
        if (item.requiresGuest && currentUser) return false;
        return true;
    });
    return buildTree(filtered);
  }, [menuItems, currentUser]);
  
  const handleLogout = async () => {
    await logout();
    closeAllMenus();
    navigate('/');
  };

  const closeAllMenus = () => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    setOpenSubMenus({});
  };

  const toggleSubMenu = (itemId: string) => {
    setOpenSubMenus(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };
  
  const renderThemeToggle = () => (
     <button onClick={toggleTheme} className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Toggle theme">
        {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        )}
      </button>
  );

  const NavMenu: React.FC<{ items: TreeItem[] }> = ({ items }) => (
    <ul className="space-y-2">
      {items.map(item => {
        if (item.children.length > 0) {
          const isOpen = openSubMenus[item.id];
          return (
            <li key={item.id} className="select-none">
              <button
                onClick={() => toggleSubMenu(item.id)}
                className={`w-full flex justify-between items-center rounded-lg text-sm font-medium px-4 py-3 transition-all duration-200 ${
                    isOpen 
                    ? 'bg-gray-100 dark:bg-gray-700/60 text-indigo-600 dark:text-indigo-400' 
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                aria-expanded={isOpen}
              >
                <span className="truncate">{t(item.titleKey, { defaultValue: item.titleKey })}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700 ml-4 my-1 space-y-1">
                  <NavMenu items={item.children} />
                </div>
              </div>
            </li>
          );
        }
        return (
          <li key={item.id}>
            <NavLink
              to={getFinalPath(item)}
              target={item.target || '_self'}
              onClick={closeAllMenus}
              className={({ isActive }) => `block rounded-lg text-sm font-medium px-4 py-3 transition-all duration-200 ${
                  isActive 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
              end
            >
              {t(item.titleKey, { defaultValue: item.titleKey })}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <header className={`bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky ${topClass} z-40 transition-all duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="container mx-auto px-4 flex justify-between items-center h-16">
          <Link to="/" onClick={closeAllMenus} className="flex-shrink-0 transition-transform hover:scale-105 active:scale-95">
              {displayedLogo ? <img src={displayedLogo} alt="App Logo" className="h-9 object-contain" /> : <span className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">{t('header.title')}</span>}
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
                <LanguageSwitcher />
                {currentUser && <NotificationPopover />}
                {renderThemeToggle()}
            </div>
            {currentUser && userProfile ? (
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center focus:outline-none group">
                  <img src={userProfile.photoURL ? transformCloudinaryUrl(userProfile.photoURL, 'w_250,h_250,c_fill,g_auto') : `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userProfile.username)}`} alt="User avatar" className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700 group-hover:ring-indigo-500 transition-all"/>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl py-2 z-50 ring-1 ring-black ring-opacity-5 transform origin-top-right transition-all">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
                        <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{userProfile.username}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{currentUser.email}</p>
                      </div>
                      <div className="py-1">
                        <NavLink to="/profile" onClick={closeAllMenus} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">{t('header.profile')}</NavLink>
                        <NavLink to="/rewards" onClick={closeAllMenus} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">{t('header.rewards')}</NavLink>
                        {isAdmin && <NavLink to="/admin" onClick={closeAllMenus} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">{t('header.adminPanel')}</NavLink>}
                      </div>
                      <div className="border-t border-gray-100 dark:border-gray-700/50 py-1">
                        <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">{t('header.logout')}</button>
                      </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-2 px-4 rounded-full transition-all hover:opacity-90 text-sm whitespace-nowrap shadow-sm">{t('header.login')}</Link>
            )}
             <button ref={hamburgerRef} onClick={() => setIsMenuOpen(true)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors" aria-label="Open menu">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
              </button>
          </div>
        </div>
      </header>
      
      {/* Off-canvas menu */}
      <div className={`relative z-50 ${isMenuOpen ? '' : 'pointer-events-none'}`} role="dialog" aria-modal="true" aria-hidden={!isMenuOpen}>
        {/* Backdrop */}
        <div 
          className={`fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity ease-in-out duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`} 
          onClick={closeAllMenus}
        ></div>
        
        <div className="fixed inset-0 flex justify-end pointer-events-none">
          <div 
            className={`pointer-events-auto relative flex h-full w-full max-w-xs flex-col bg-white dark:bg-gray-900 shadow-2xl transform transition-transform ease-out duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
            {/* Menu Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                <div className="flex-shrink-0">
                    {displayedLogo ? (
                        <img src={displayedLogo} alt="App Logo" className="h-8 object-contain" />
                    ) : (
                        <span className="text-lg font-bold text-gray-900 dark:text-white">{t('header.title')}</span>
                    )}
                </div>
                <button type="button" className="p-2 -mr-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors" onClick={closeAllMenus}>
                    <span className="sr-only">Close menu</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-4">
                <NavMenu items={menuTree} />
            </div>
            
            {/* Menu Footer */}
            <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900/50">
                 <div className="flex flex-col gap-4 sm:hidden">
                     <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Language</span>
                        <LanguageSwitcher />
                     </div>
                     <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Appearance</span>
                        {renderThemeToggle()}
                     </div>
                 </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HeaderStyle3;