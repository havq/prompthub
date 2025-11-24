
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../../utils/types';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import { calculateLevel } from '../../services/gamificationService';
import Spinner from '../Spinner';
import { useLanguage } from '../../context/LanguageContext';

interface ProfileHeaderProps {
    userProfile: UserProfile;
    promptsCount: number;
    isCurrentUser: boolean;
    isFollowing?: boolean;
    isFollowLoading?: boolean;
    onFollowToggle?: () => void;
    onEdit?: () => void;
    onChangePassword?: () => void;
    onToggleSidebar?: () => void;
    onSettingsClick?: () => void;
    onShowEarnPoints?: () => void;
}

const formatCount = (count: number | undefined): string => {
    const num = Number(count || 0);
    if (num < 1000) {
      return num.toLocaleString();
    }
    const units = ['k', 'm', 'b', 't'];
    // toFixed(0).length is a trick to get number of digits
    const unit = Math.floor((num.toFixed(0).length - 1) / 3) - 1;
    
    if (unit >= units.length) {
        return num.toLocaleString();
    }
    
    const value = num / Math.pow(1000, unit + 1);

    // Truncate to one decimal place
    const truncatedValue = Math.floor(value * 10) / 10;
    
    return String(truncatedValue) + units[unit];
};


const ProfileHeader: React.FC<ProfileHeaderProps> = ({ userProfile, isCurrentUser, promptsCount, isFollowing, isFollowLoading, onFollowToggle, onEdit, onChangePassword, onToggleSidebar, onSettingsClick, onShowEarnPoints }) => {
    const { t } = useLanguage();
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
    const settingsMenuRef = useRef<HTMLDivElement>(null);
    const levelInfo = calculateLevel(userProfile.points);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
                setIsSettingsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="relative h-60 md:h-80 rounded-t-lg overflow-hidden">
                {userProfile.profileBannerUrl ? (
                     <img src={transformCloudinaryUrl(userProfile.profileBannerUrl, 'w_1400,h_400,c_fill,g_auto')} alt="Profile banner" className="w-full h-full object-cover" />
                ) : (
                    <div className="h-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
                )}
                 <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
                    {onToggleSidebar && (
                         <button onClick={onToggleSidebar} className="lg:hidden bg-black/30 backdrop-blur-sm text-white p-2.5 rounded-lg hover:bg-black/50 transition-colors" aria-label="Toggle sidebar">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                        </button>
                    )}
                    {isCurrentUser && (
                        <div ref={settingsMenuRef} className="relative">
                            <button onClick={() => setIsSettingsMenuOpen(prev => !prev)} className="bg-black/30 backdrop-blur-sm text-white p-2.5 rounded-lg hover:bg-black/50 transition-colors" aria-label="Open settings">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </button>
                            {isSettingsMenuOpen && (
                                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg py-1 bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-20">
                                    {onEdit && <button onClick={() => { onEdit(); setIsSettingsMenuOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">{t('profile.editButton')}</button>}
                                    {onChangePassword && <button onClick={() => { onChangePassword(); setIsSettingsMenuOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">{t('profile.changePasswordButton')}</button>}
                                    {onSettingsClick && <button onClick={() => { onSettingsClick(); setIsSettingsMenuOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">{t('profile.notificationSettings.title')}</button>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="relative px-4 sm:px-6 lg:px-8 pb-8">
                 <div className="flex flex-col md:flex-row items-center -mt-20 md:items-end md:space-x-5">
                    <div className="relative flex-shrink-0 group">
                        <img
                            src={transformCloudinaryUrl(userProfile.photoURL || '', 'w_200,h_200,c_fill,g_auto') || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userProfile.username)}`}
                            alt="Profile"
                            className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover ring-4 ring-white dark:ring-gray-800 transition-opacity group-hover:opacity-75"
                        />
                         {isCurrentUser && onEdit && (
                            <button
                                onClick={onEdit}
                                className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-4 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-indigo-500"
                                aria-label="Change profile picture"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2-2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="mt-4 md:mt-0 flex-grow w-full flex flex-col md:flex-row items-center justify-center md:justify-between">
                        <div className="text-center md:text-left">
                            <div className="flex justify-center md:justify-start items-center gap-2">
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{userProfile.username}</h1>

                                    <div className="bg-amber-600 text-white text-xs font-semibold px-1 rounded-full flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Level {levelInfo.level}</span>
                                    </div>

                            </div>
                             <div className="mt-4 flex flex-wrap justify-center md:justify-start items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                                <span><strong className="text-gray-900 dark:text-white">{formatCount(promptsCount)}</strong> {t('profile.promptsStat')}</span>
                                <span className="flex items-center gap-1">
                                    <strong className="text-gray-900 dark:text-white">{formatCount(userProfile.points)}</strong> {t('profile.pointsStat')}
                                    {onShowEarnPoints && (
                                        <button onClick={onShowEarnPoints} className="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 ml-1" aria-label="How to earn points">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </button>
                                    )}
                                </span>
                                <span><strong className="text-gray-900 dark:text-white">{formatCount(userProfile.followerCount)}</strong> {t('profile.followersStat')}</span>
                                <span><strong className="text-gray-900 dark:text-white">{formatCount(Object.keys(userProfile.following || {}).length)}</strong> {t('profile.followingStat')}</span>
                            </div>

                        </div>
                        <div className="mt-4 md:mt-0">
                            {!isCurrentUser && (
                                <button
                                    onClick={onFollowToggle}
                                    disabled={isFollowLoading}
                                    className={`py-2 px-6 rounded-md text-sm font-medium w-32 flex justify-center transition-colors ${
                                        isFollowing
                                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    }`}
                                >
                                    {isFollowLoading ? <Spinner size="sm" /> : isFollowing ? t('authorPage.unfollow') : t('authorPage.follow')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;
