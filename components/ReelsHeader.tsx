import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { transformCloudinaryUrl } from '../services/cloudinaryUtils';
import { useLanguage } from '../context/LanguageContext';

interface ReelsHeaderProps {
    searchTerm: string;
    handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ReelsHeader: React.FC<ReelsHeaderProps> = ({ searchTerm, handleSearchChange }) => {
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const { t } = useLanguage();

    return (
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-md">
            <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
                {/* Back Button */}
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Go back"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                {/* Search Bar */}
                <div className="flex-grow max-w-lg">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        placeholder={t('home.searchPlaceholder')}
                        className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-full px-5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-transparent"
                    />
                </div>

                {/* User Profile / Login */}
                <div>
                    {userProfile ? (
                        <Link to="/profile" className="block">
                            <img 
                                src={transformCloudinaryUrl(userProfile.photoURL || '', 'w_100,h_100,c_fill,g_auto') || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userProfile.username)}`} 
                                alt="User avatar" 
                                className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-300 dark:ring-gray-600 hover:ring-indigo-500 transition-all"
                            />
                        </Link>
                    ) : (
                        <Link to="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm whitespace-nowrap">
                            {t('header.login')}
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
};

export default ReelsHeader;