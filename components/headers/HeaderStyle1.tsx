
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
    if (item.linkType === 'category' && item.linkedId) {
        return buildUrl('promptCategory', { categoryId: item.linkedId });
    }
    if (item.linkType === 'post-category' && item.linkedId) {
        return buildUrl('postCategory', { categoryId: item.linkedId });
    }
    if (item.linkType === 'page' && item.linkedId) {
        // This is a simplification; for full accuracy, we'd need access to the static pages list
        // to get the slug, but the path is usually stored directly for pages.
        // The current implementation where path is stored is sufficient here.
    }
    return item.path;
};


const HeaderStyle1: React.FC<{ isNotificationBarVisible?: boolean }> = ({ isNotificationBarVisible = false }) => {
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
  const [openDesktopDropdown, setOpenDesktopDropdown] = useState<string | null>(null);
  const [mobileSubMenu, setMobileSubMenu] = useState<TreeItem | null>(null);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const dropdownTimeoutRef = useRef<number | null>(null);
  
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
        setLogos({
            light: newSettings.appLogoLight,
            dark: newSettings.appLogoDark
        });
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
    });
    return buildTree(filtered);
  }, [menuItems, currentUser]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (
        mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) &&
        hamburgerRef.current && !hamburgerRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
        setMobileSubMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsUserMenuOpen(false);
      setIsMobileMenuOpen(false);
      setMobileSubMenu(null);
      navigate('/');
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };
  
  const closeUserMenu = () => setIsUserMenuOpen(false);
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setMobileSubMenu(null);
  }

  const handleDesktopDropdownEnter = (itemId: string) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setOpenDesktopDropdown(itemId);
  };

  const handleDesktopDropdownLeave = () => {
    dropdownTimeoutRef.current = window.setTimeout(() => {
      setOpenDesktopDropdown(null);
    }, 200);
  };

  const showGoPro = settings.showGoProButton ?? true;
  const registrationEnabled = settings.registrationEnabled ?? true;
  
  const renderThemeToggle = () => (
     <button
        onClick={toggleTheme}
        className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none transition-colors md:focus:ring-2 md:focus:ring-offset-2 md:focus:ring-offset-white md:dark:focus:ring-offset-gray-800 md:focus:ring-indigo-500"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        )}
      </button>
  );

  const renderDesktopMenu = () => (
    <>
      {menuTree.map(item => {
        // Hide 'Explore Reels' and 'Prompts List' on medium screens (tablets) to prevent crowding.
        // They will reappear on large screens.
        const isTabletHidden = item.path === '/reels' || item.path === '/prompts-list';
        const finalPath = getFinalPath(item);

        return (
            <div 
              key={item.id} 
              className={`relative ${isTabletHidden ? 'hidden lg:block' : ''}`}
              onMouseEnter={() => item.children.length > 0 && handleDesktopDropdownEnter(item.id)}
              onMouseLeave={() => item.children.length > 0 && handleDesktopDropdownLeave()}
            >
              <NavLink
                to={finalPath}
                target={item.target || '_self'}
                className={({ isActive }) => `flex items-center gap-1 transition-colors font-medium text-sm px-2 py-1 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                onClick={() => setOpenDesktopDropdown(null)}
                end
              >
                {t(item.titleKey, {defaultValue: item.titleKey})}
                {item.children.length > 0 && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </NavLink>
              {item.children.length > 0 && openDesktopDropdown === item.id && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                  {item.children.map(child => (
                    <NavLink
                      key={child.id}
                      to={getFinalPath(child)}
                      target={child.target || '_self'}
                      onClick={() => setOpenDesktopDropdown(null)}
                      className={({isActive}) => `block px-4 py-2 text-sm ${isActive ? 'bg-indigo-50 dark:bg-gray-600 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                      end
                    >
                      {t(child.titleKey, {defaultValue: child.titleKey})}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
        );
      })}
    </>
  );

  const renderMobileMenu = (items: TreeItem[]) => (
    <div className="py-1">
      {items.map(item => (
        item.children.length > 0 ? (
          <button key={item.id} onClick={() => setMobileSubMenu(item)} className="w-full flex justify-between items-center px-4 py-3 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
            <span>{t(item.titleKey, {defaultValue: item.titleKey})}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
          </button>
        ) : (
          <NavLink key={item.id} to={getFinalPath(item)} target={item.target || '_self'} onClick={closeMobileMenu} className={({isActive}) => `block px-4 py-3 text-base ${isActive ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 font-semibold' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`} end>
            {t(item.titleKey, {defaultValue: item.titleKey})}
          </NavLink>
        )
      ))}
    </div>
  );

  return (
    <header className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md sticky ${topClass} z-50 transition-all duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center relative">
        <Link to="/" onClick={closeMobileMenu} className="text-2xl font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center">
          {displayedLogo ? (
            <img src={displayedLogo} alt="App Logo" className="h-10 max-w-xs object-contain" />
          ) : (
            t('header.title')
          )}
        </Link>
        <div className="hidden md:flex items-center space-x-2 md:space-x-4">           
           {renderDesktopMenu()}
           {currentUser && (
                <Link to="/submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm whitespace-nowrap">
                    Submit Prompt
                </Link>
           )}
           {!isPro && showGoPro && (
                <Link to="/go-pro" className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold py-2 px-4 rounded-full transition-all shadow-md hover:shadow-lg text-sm whitespace-nowrap">
                    {t('goPro.title')}
                </Link>
           )}
           <LanguageSwitcher />           
           {currentUser && <NotificationPopover />}
           {renderThemeToggle()}
          {currentUser && userProfile ? (
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center space-x-2 focus:outline-none">
                <img src={userProfile.photoURL ? transformCloudinaryUrl(userProfile.photoURL, 'w_250,h_250,c_fill,g_auto') : `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userProfile.username)}&size=32`} alt="User avatar" className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-300 dark:ring-gray-600 hover:ring-indigo-500 transition-all"/>
                <span className="text-gray-800 dark:text-white font-medium hidden sm:block">{userProfile.username}</span>
              </button>
              {isUserMenuOpen && (
                 <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                   <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-900 dark:text-white font-semibold truncate">{userProfile.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentUser.email}</p>
                   </div>
                   {!isPro && showGoPro && (
                        <NavLink to="/go-pro" onClick={closeUserMenu} className={({isActive}) => `block px-4 py-2 text-sm ${isActive ? 'bg-indigo-50 dark:bg-gray-600 text-indigo-700 dark:text-indigo-300' : 'text-amber-600 dark:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-600 font-bold'}`}>{t('goPro.title')}</NavLink>
                    )}
                   <NavLink to="/profile" onClick={closeUserMenu} className={({isActive}) => `block px-4 py-2 text-sm ${isActive ? 'bg-indigo-50 dark:bg-gray-600 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>{t('header.profile')}</NavLink>
                   <NavLink to="/rewards" onClick={closeUserMenu} className={({isActive}) => `block px-4 py-2 text-sm ${isActive ? 'bg-indigo-50 dark:bg-gray-600 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>{t('header.rewards')}</NavLink>
                   <NavLink to="/support" onClick={closeUserMenu} className={({isActive}) => `block px-4 py-2 text-sm ${isActive ? 'bg-indigo-50 dark:bg-gray-600 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>Support</NavLink>
                   {isAdmin && (
                    <NavLink to="/admin" onClick={closeUserMenu} className={({isActive}) => `block px-4 py-2 text-sm ${isActive ? 'bg-indigo-50 dark:bg-gray-600 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>{t('header.adminPanel')}</NavLink>
                   )}
                   <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-red-700 dark:hover:text-red-300 transition-colors">
                     {t('header.logout')}
                   </button>
                 </div>
              )}
            </div>
          ) : (
            <div className="flex items-center">
               <Link to="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm whitespace-nowrap">
                  {t('header.login')}{registrationEnabled && ` / ${t('header.register')}`}
               </Link>
            </div>
          )}
        </div>

        <div className="md:hidden flex items-center space-x-1">
            <LanguageSwitcher />
            {currentUser && <NotificationPopover />}          
            {renderThemeToggle()}
            <button ref={hamburgerRef} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none" aria-label="Open menu">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
            </button>
        </div>
        
        {isMobileMenuOpen && (
            <div ref={mobileMenuRef} className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 ring-1 ring-black ring-opacity-5 md:hidden">
                 {mobileSubMenu ? (
                   <div>
                     <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                        <button onClick={() => setMobileSubMenu(null)} className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                          {t('common.back')}
                        </button>
                     </div>
                     <div className="py-1">
                      <NavLink 
                        to={getFinalPath(mobileSubMenu)} 
                        target={mobileSubMenu.target || '_self'} 
                        onClick={closeMobileMenu} 
                        className={({isActive}) => `block px-4 py-3 text-base font-semibold ${isActive ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700/50'}`}
                        end
                      >
                        {t(mobileSubMenu.titleKey, {defaultValue: mobileSubMenu.titleKey})}
                      </NavLink>
                      {renderMobileMenu(mobileSubMenu.children)}
                     </div>
                   </div>
                 ) : (
                   <>
                    {currentUser && userProfile ? (
                        <>
                            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                                <p className="text-base font-semibold text-gray-900 dark:text-white truncate">{userProfile.username}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{currentUser.email}</p>
                            </div>
                            <div className="py-1">
                                <NavLink to="/submit" onClick={closeMobileMenu} className="block px-4 py-3 text-base font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-gray-600">Submit Prompt</NavLink>
                                {!isPro && showGoPro && <NavLink to="/go-pro" onClick={closeMobileMenu} className={({isActive}) => `block px-4 py-3 text-base ${isActive ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{t('goPro.title')}</NavLink>}
                                <NavLink to="/profile" onClick={closeMobileMenu} className={({isActive}) => `block px-4 py-3 text-base ${isActive ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 font-semibold' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{t('header.profile')}</NavLink>
                                <NavLink to="/rewards" onClick={closeMobileMenu} className={({isActive}) => `block px-4 py-3 text-base ${isActive ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 font-semibold' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{t('header.rewards')}</NavLink>
                                <NavLink to="/support" onClick={closeMobileMenu} className={({isActive}) => `block px-4 py-3 text-base ${isActive ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 font-semibold' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Support</NavLink>
                                {isAdmin && <NavLink to="/admin" onClick={closeMobileMenu} className={({isActive}) => `block px-4 py-3 text-base ${isActive ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 font-semibold' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{t('header.adminPanel')}</NavLink>}
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-600 mt-1 pt-1">
                              {renderMobileMenu(menuTree)}
                            </div>
                        </>
                    ) : (
                        <>
                          {!isPro && showGoPro && <Link to="/go-pro" onClick={closeMobileMenu} className="block px-4 py-3 text-base text-amber-600 dark:text-amber-400 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">{t('goPro.title')}</Link>}
                          {renderMobileMenu(menuTree)}
                          <div className="border-t border-gray-200 dark:border-gray-600 mt-1 pt-1">
                            <Link to="/login" onClick={closeMobileMenu} className="block px-4 py-3 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">{t('header.login')}{registrationEnabled && ` / ${t('header.register')}`}</Link>
                          </div>
                        </>
                    )}
                    
                    {currentUser && (
                        <div className="border-t border-gray-200 dark:border-gray-600 mt-1 pt-1">
                            <button onClick={handleLogout} className="w-full text-left block px-4 py-3 text-base text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-red-700 dark:hover:text-red-300 transition-colors">
                                {t('header.logout')}
                            </button>
                        </div>
                    )}
                   </>
                 )}
            </div>
        )}
      </nav>
    </header>
  );
};

export default HeaderStyle1;
