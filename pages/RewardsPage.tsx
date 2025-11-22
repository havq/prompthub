import React from 'react';
import { useAuth } from '../context/AuthContext';
import UserRewards from '../components/profile/UserRewards';
import Spinner from '../components/Spinner';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';

const RewardsPage: React.FC = () => {
    const { userProfile, loading } = useAuth();
    const { t } = useLanguage();

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!userProfile) {
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {t('profile.rewards.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Please log in to view your rewards and points.
                </p>
                <Link 
                    to="/login" 
                    className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition-colors"
                >
                    {t('header.login')}
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="mb-6">
                <Link 
                    to="/profile" 
                    className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>{t('common.back')}</span> 
                </Link>
            </div>
            <UserRewards userProfile={userProfile} />
        </div>
    );
};

export default RewardsPage;