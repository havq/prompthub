import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSettings } from '../../services/settingsService';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSwitcher from '../LanguageSwitcher';
import NotificationPopover from '../NotificationPopover';
import { AppSettings, NavigationLink } from '../../utils/types';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import { buildUrl } from '../../utils/permalinks';

const HeaderStyle2: React.FC<{ isNotificationBarVisible?: boolean }> = ({ isNotificationBarVisible = false }) => {
  const { currentUser, userProfile, logout, isAdmin, isPro } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [logos, setLogos] = useState(() => ({
      light: settings.appLogoLight,
      dark: settings.appLogoDark
  }));
  const [menuItems, setMenuItems] = useState(() => settings.navigationMenu || []);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
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

  const menuTree = useMemo(() => {
    const filtered = menuItems.filter(item => {
        if (item.requiresAuth && !currentUser) return false;
        if (item.requiresGuest && currentUser) return false;
        return true;
    }).filter(item => !item.parentId).sort((a, b) => a.order - b.order); // Only top-level items
    return filtered;
  }, [menuItems, currentUser]);

  const midIndex = Math.ceil(menuTree.length / 2);
  const leftMenuItems = menuTree.slice(0, midIndex);
  const rightMenuItems = menuTree.slice(midIndex);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setIsUserMenuOpen(false);
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) && hamburgerRef.current && !hamburgerRef.current.contains(event.target as Node)) setIsMobileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/');
  };
  
  const closeAllMenus = () => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  }

  const renderThemeToggle = () => (
     <button onClick={toggleTheme} className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Toggle theme">
        {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        )}
      </button>
  );

  const getFinalPath = (item: NavigationLink): string => {
    if (item.linkType === 'category' && item.linkedId) return buildUrl('promptCategory', { categoryId: item.linkedId });
    if (item.linkType === 'post-category' && item.linkedId) return buildUrl('postCategory', { categoryId: item.linkedId });
    return item.path;
  };
  
  const NavItems: React.FC<{ items: NavigationLink[] }> = ({ items }) => (
    <>
      {items.map(item => (
          <NavLink key={item.id} to={getFinalPath(item)} target={item.target || '_self'} className={({ isActive }) => `transition-colors font-medium text-sm px-3 py-2 rounded-md ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`} end>
              {t(item.titleKey, {defaultValue: item.titleKey})}
          </NavLink>
      ))}
    </>
  );

  return (
    <header className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm sticky ${topClass} z-50 transition-all duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <nav className="container mx-auto px-4">
        {/* Desktop Menu */}
        <div className="hidden md:flex justify-between items-center h-16">
            <div className="flex items-center justify-start w-1/3 space-x-1">
                <NavItems items={leftMenuItems} />
            </div>
            <div className="flex items-center justify-center w-1/3">
                <Link to="/" onClick={closeAllMenus} className="flex-shrink-0">
                    {displayedLogo ? <img src={displayedLogo} alt="App Logo" className="h-10 max-w-xs object-contain" /> : <span className="text-2xl font-bold">{t('header.title')}</span>}
                </Link>
            </div>
            <div className="flex items-center justify-end w-1/3 space-x-1">
                <NavItems items={rightMenuItems} />
                <div className="flex items-center space-x-1 pl-2">
                    <LanguageSwitcher />
                    {currentUser && <NotificationPopover />}
                    {renderThemeToggle()}
                    {currentUser && userProfile ? (
                        <div className="relative" ref={userMenuRef}>
                            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center focus:outline-none">
                                <img src={userProfile.photoURL ? transformCloudinaryUrl(userProfile.photoURL, 'w_250,h_250,c_fill,g_auto') : `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userProfile.username)}`} alt="User avatar" className="h-9 w-9 rounded-full object-cover"/>
                            </button>
                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600"><p className="text-sm font-semibold truncate">{userProfile.username}</p><p className="text-xs text-gray-500 truncate">{currentUser.email}</p></div>
                                    <NavLink to="/profile" onClick={closeAllMenus} className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600">{t('header.profile')}</NavLink>
                                    <NavLink to="/rewards" onClick={closeAllMenus} className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600">{t('header.rewards')}</NavLink>
                                    {isAdmin && <NavLink to="/admin" onClick={closeAllMenus} className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600">{t('header.adminPanel')}</NavLink>}
                                    <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600">{t('header.logout')}</button>
                                </div>
                            )}
                        </div>
                    ) : (
                       <Link to="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-md transition-colors text-sm whitespace-nowrap">{t('header.login')}</Link>
                    )}
                </div>
            </div>
        </div>
        
        {/* Mobile Menu */}
        <div className="md:hidden flex justify-between items-center h-16">
            <Link to="/" onClick={closeAllMenus}>
                {displayedLogo ? <img src={displayedLogo} alt="App Logo" className="h-10 object-contain" /> : <span className="text-xl font-bold">{t('header.title')}</span>}
            </Link>
            <div className="flex items-center">
                {currentUser && <NotificationPopover />}
                <button ref={hamburgerRef} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-full" aria-label="Open menu">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                </button>
            </div>
        </div>
        
        {isMobileMenuOpen && (
            <div ref={mobileMenuRef} className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-gray-800 shadow-lg z-50 py-4">
                <div className="container mx-auto px-4 flex flex-col items-center space-y-2">
                    {menuTree.map(item => (
                         <NavLink key={item.id} to={getFinalPath(item)} target={item.target || '_self'} onClick={closeAllMenus} className={({isActive}) => `block text-base w-full text-center py-2 ${isActive ? 'font-semibold text-indigo-600' : ''}`}>{t(item.titleKey)}</NavLink>
                    ))}
                     <div className="pt-4 border-t border-gray-200 dark:border-gray-700 w-full flex flex-col items-center space-y-4">
                        <div className="flex items-center justify-center gap-4">
                            <LanguageSwitcher />
                            {renderThemeToggle()}
                        </div>
                         {currentUser && userProfile ? (
                             <>
                                <NavLink to="/profile" onClick={closeAllMenus} className="w-full text-center">
                                    <div className="flex items-center gap-3 justify-center"><img src={userProfile.photoURL ? transformCloudinaryUrl(userProfile.photoURL, 'w_250,h_250,c_fill,g_auto') : `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userProfile.username)}`} alt="Avatar" className="h-8 w-8 rounded-full"/><span>{userProfile.username}</span></div>
                                </NavLink>
                                <NavLink to="/rewards" onClick={closeAllMenus} className="w-full text-center py-2 font-semibold">{t('header.rewards')}</NavLink>
                                {isAdmin && <NavLink to="/admin" onClick={closeAllMenus} className="w-full text-center py-2 font-semibold">{t('header.adminPanel')}</NavLink>}
                                <button onClick={handleLogout} className="w-full text-center text-red-500 font-semibold">{t('header.logout')}</button>
                             </>
                         ) : (
                            <Link to="/login" onClick={closeAllMenus} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-md">Login / Register</Link>
                         )}
                     </div>
                </div>
            </div>
        )}
      </nav>
    </header>
  );
};

export default HeaderStyle2;