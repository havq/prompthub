import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getSettings } from '../services/settingsService';
import { transformCloudinaryUrl } from '../services/cloudinaryUtils';

const ReelsLeftSidebar: React.FC = () => {
    const { t } = useLanguage();
    const { userProfile, currentUser } = useAuth();
    const { theme } = useTheme();
    const location = useLocation();
    const [settings, setSettings] = useState(() => getSettings());

    useEffect(() => {
        const handleSettingsChange = () => {
            setSettings(getSettings());
        };
        window.addEventListener('storage', handleSettingsChange);
        return () => window.removeEventListener('storage', handleSettingsChange);
    }, []);

    const isActive = (path: string) => location.pathname === path;
    
    const displayedLogo = theme === 'dark' ? (settings.appLogoDark || settings.appLogoLight) : settings.appLogoLight;

    return (
        <div className="hidden lg:flex w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-full overflow-y-auto shrink-0 z-20 relative">
            <div className="p-4 flex flex-col h-full">
                <Link to="/" className="flex items-center gap-2 mb-6 px-2 h-10">
                    {displayedLogo ? (
                        <img src={displayedLogo} alt="App Logo" className="h-8 object-contain" />
                    ) : (
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">Prompthub</span>
                    )}
                </Link>
                
                <nav className="space-y-1 flex-grow">
                    <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive('/') ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-gray-800' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span>{t('common.home')}</span>
                    </Link>

                    {currentUser && (
                        <Link to="/feed" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive('/feed') ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-gray-800' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                            </svg>
                            <span>{t('header.feed')}</span>
                        </Link>
                    )}

                    <Link to="/reels/explore" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-bold ${isActive('/reels/explore') || location.pathname.includes('/reels/') ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{t('header.reelsExplore')}</span>
                    </Link>

                    <Link to="/posts" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive('/posts') ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-gray-800' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                        <span>{t('header.posts')}</span>
                    </Link>

                    <Link to="/community" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive('/community') ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-gray-800' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>{t('header.community')}</span>
                    </Link>

                    <Link to="/collections" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive('/collections') ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-gray-800' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                        </svg>
                        <span>{t('header.collections')}</span>
                    </Link>

                    <Link to="/showcase" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive('/showcase') ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-gray-800' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{t('header.showcase')}</span>
                    </Link>
                </nav>
                
                <div className="mt-auto border-t border-gray-200 dark:border-gray-700 pt-4">
                   {userProfile ? (
                       <Link to="/profile" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                          <img src={transformCloudinaryUrl(userProfile.photoURL || '', 'w_100,h_100,c_fill,g_auto') || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userProfile.username)}`} className="w-8 h-8 rounded-full object-cover bg-gray-200" alt={userProfile.username} />
                          <div className="flex flex-col overflow-hidden">
                              <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{userProfile.username}</span>
                              <span className="text-xs text-gray-500 truncate">{currentUser?.email}</span>
                          </div>
                       </Link>
                   ) : (
                       <div className="px-4 py-2">
                           <p className="text-xs text-gray-500 mb-3">Log in to follow creators, like videos, and view comments.</p>
                           <Link to="/login" className="block w-full py-2.5 text-center bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors text-sm">
                               {t('header.login')}
                           </Link>
                       </div>
                   )}
                </div>
                
                <div className="mt-4 px-4 text-[10px] text-gray-400 dark:text-gray-600">
                    <p>© {new Date().getFullYear()} Prompthub</p>
                </div>
            </div>
        </div>
    );
};

export default ReelsLeftSidebar;