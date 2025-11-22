
import React, { useState, useMemo, useCallback } from 'react';
import { UserProfile, Prompt, Collection, ShowcaseImage } from '../../types';
import UserPrompts from './UserPrompts';
import UserFavorites from './UserFavorites';
import UserCollections from './UserCollections';
import UserShowcase from './UserShowcase';
//import UserSettings from './UserSettings';
import { useLanguage } from '../../context/LanguageContext';
import Spinner from '../Spinner';
import AnalyticsDashboard from './AnalyticsDashboard';
import UserRewards from './UserRewards';

// This type consolidates all the props needed by the prompt cards within the tabs
interface CardProps {
    categories: any[];
    ratings: Record<string, number>;
    favorites: Set<string>;
    averageRatings: Record<string, { average: number; count: number }>;
    commentCounts: Record<string, number>;
    showcaseCounts: Record<string, number>;
    isAdmin: boolean;
    currentUser: any;
    onRate: (prompt: Prompt, rating: number) => void;
    onToggleFavorite: (prompt: Prompt) => void;
    onFindSimilar: (prompt: Prompt) => void;
    onOpenDetail: (prompt: Prompt) => void;
    onReport: (prompt: Prompt) => void;
    onRemix: (prompt: Prompt) => void;
    onAddToCollection: (prompt: Prompt) => void;
    onUploadShowcase: (prompt: Prompt) => void;
    onEdit: (prompt: Prompt) => void;
    onDelete: (prompt: Prompt) => void;
    onCommentUpdate: (promptId: string, change: 1 | -1) => void;
    onShowcaseUpdate: (promptId: string, change: 1 | -1) => void;
}

interface ProfileTabsProps {
    userProfile: UserProfile;
    isCurrentUserPage: boolean;
    isGalleryLoading: boolean;
    activeTab: string;
    onTabChange: (tab: any) => void;
    allPrompts: Prompt[];
    isPro: boolean;
    allShowcaseImages: ShowcaseImage[];
    setGalleryState: (state: { open: boolean, index: number }) => void;
    setDeletingShowcaseImageId: (id: string | null) => void;
    collections: Collection[];
    setCollections: React.Dispatch<React.SetStateAction<Collection[]>>;
    cardProps: CardProps;
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

const ProfileTabs: React.FC<ProfileTabsProps> = ({
    userProfile, isCurrentUserPage, isGalleryLoading, activeTab, onTabChange, allPrompts, isPro,
    allShowcaseImages, setGalleryState, setDeletingShowcaseImageId,
    collections, setCollections, cardProps
}) => {
    const { t } = useLanguage();

    const myPublicPrompts = useMemo(() => {
        return allPrompts
            .filter(p => p.authorId === userProfile.uid && !p.isPrivate && p.status !== 'pending')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allPrompts, userProfile]);

    const myPrivatePrompts = useMemo(() => {
        if (!isCurrentUserPage) return [];
        return allPrompts
            .filter(p => p.authorId === userProfile.uid && p.isPrivate && p.status !== 'pending')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allPrompts, userProfile, isCurrentUserPage]);

    const myPendingPrompts = useMemo(() => {
        if (!isCurrentUserPage) return [];
        return allPrompts
            .filter(p => p.authorId === userProfile.uid && p.status === 'pending')
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allPrompts, userProfile, isCurrentUserPage]);

    const myShowcaseImages = useMemo(() => {
        return allShowcaseImages
            .filter(img => img.userId === userProfile.uid)
            .map(image => ({
                ...image,
                promptText: allPrompts.find(p => p.id === image.promptId)?.text,
            }));
    }, [allShowcaseImages, userProfile, allPrompts]);

    const tabData = useMemo(() => {
        const publicTabs = [
            { name: 'prompts', labelKey: isCurrentUserPage ? 'profile.myPromptsTab' : 'authorPage.promptsTab', count: myPublicPrompts.length, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> },
            { name: 'showcase', labelKey: isCurrentUserPage ? 'profile.myShowcaseTab' : 'authorPage.showcaseTab', count: myShowcaseImages.length, icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>},
        ];
        if (!isCurrentUserPage) {
            return publicTabs;
        }
        return [
            ...publicTabs,
            ...(userProfile.role !== 'Admin' ? [{ name: 'pending', labelKey: 'profile.myPendingPromptsTab', count: myPendingPrompts.length, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }] : []),
            ...(isPro || userProfile.role === 'Admin' ? [{ name: 'private', labelKey: 'profile.myPrivatePromptsTab', count: myPrivatePrompts.length, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg> }] : []),
            { name: 'favorites', labelKey: 'profile.myFavoritesTab', count: cardProps.favorites.size, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg> },
            { name: 'collections', labelKey: 'profile.myCollectionsTab', count: collections.length, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg> },
            { name: 'rewards', labelKey: 'profile.rewardsTab', count: -1, icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H4.5a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h17.25c.75 0 1.125-.412.825-.975l-2.25-4.5a.75.75 0 0 0-.675-.413H14.625" /></svg> },
            ...(isPro || userProfile.role === 'Admin' ? [{ name: 'analytics', labelKey: 'profile.analyticsTab', count: -1, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> }] : []),
        ];
    }, [isCurrentUserPage, userProfile.role, isPro, myPublicPrompts.length, myShowcaseImages.length, myPendingPrompts.length, myPrivatePrompts.length, cardProps.favorites.size, collections.length]);
    
    return (
        <>
            <div className="border-b border-gray-200 dark:border-gray-700">
                {/* Desktop Tabs */}
                <nav className="hidden lg:flex justify-around -mb-px overflow-x-auto" aria-label="Tabs">
                    {tabData.map(tab => (
                        <button key={tab.name} onClick={() => onTabChange(tab.name as any)} className={`whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm ${activeTab === tab.name ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                            {t(tab.labelKey as any)} {tab.count >= 0 ? `(${formatCount(tab.count)})` : ''}
                        </button>
                    ))}
                </nav>
                {/* Mobile Icon Tabs */}
                <nav className="flex justify-around gap-1 p-1 lg:hidden overflow-x-auto" aria-label="Tabs">
                    {tabData.map(tab => {
                        const showLabel = !isCurrentUserPage; // Show labels when viewing someone else's profile
                        const countDisplay = tab.count > 0 
                            ? (tab.count > 9 ? '9+' : tab.count)
                            : null;

                        return (
                            <button 
                                key={tab.name} 
                                onClick={() => onTabChange(tab.name as any)} 
                                title={t(tab.labelKey as any)} 
                                className={`relative flex items-center gap-2 rounded transition-colors text-sm font-medium ${showLabel ? 'px-4 py-2' : 'p-3'} ${activeTab === tab.name ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                {tab.icon}
                                {showLabel && <span>{t(tab.labelKey as any)}</span>}
                                
                                {countDisplay && (
                                    <span className={`flex items-center justify-center bg-red-500 text-white text-[10px] font-semibold rounded-full ring-2 ring-white dark:ring-gray-800 ${showLabel ? 'ml-1 h-5 w-5' : 'absolute -top-1 -right-1 h-5 w-5'}`}>
                                        {countDisplay}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </nav>
            </div>
            
            <div className="mt-6">
                 {isGalleryLoading && !allPrompts.length ? (
                    <div className="text-center py-8"><Spinner size="lg" /><p className="mt-4 text-gray-600 dark:text-gray-400">{t('profile.galleryLoading')}</p></div>
                 ) : (
                    <>
                        <div className={activeTab === 'prompts' ? 'block' : 'hidden'}>
                            <UserPrompts prompts={myPublicPrompts} cardProps={cardProps} isOwner={isCurrentUserPage} username={userProfile.username} />
                        </div>
                        <div className={activeTab === 'showcase' ? 'block' : 'hidden'}>
                            <UserShowcase images={myShowcaseImages} setGalleryState={setGalleryState} onDelete={setDeletingShowcaseImageId} isOwner={isCurrentUserPage} username={userProfile.username}/>
                        </div>

                        {isCurrentUserPage && (
                            <>
                                <div className={activeTab === 'pending' ? 'block' : 'hidden'}>
                                    <UserPrompts prompts={myPendingPrompts} cardProps={cardProps} isOwner={true} emptyMessage={t('profile.noPendingPrompts')} username={userProfile.username} />
                                </div>
                                <div className={activeTab === 'private' ? 'block' : 'hidden'}>
                                    <UserPrompts prompts={myPrivatePrompts} cardProps={cardProps} isOwner={true} emptyMessage={t('profile.noPrivatePrompts')} username={userProfile.username} />
                                </div>
                                <div className={activeTab === 'favorites' ? 'block' : 'hidden'}>
                                    <UserFavorites allPrompts={allPrompts} favorites={cardProps.favorites} cardProps={cardProps} />
                                </div>
                                <div className={activeTab === 'collections' ? 'block' : 'hidden'}>
                                    <UserCollections collections={collections} setCollections={setCollections} allPrompts={allPrompts} cardProps={cardProps} />
                                </div>
                                <div className={activeTab === 'rewards' ? 'block' : 'hidden'}>
                                    <UserRewards userProfile={userProfile} />
                                </div>
                                <div className={activeTab === 'analytics' ? 'block' : 'hidden'}>
                                    <AnalyticsDashboard userId={userProfile.uid} />
                                </div>
                            </>
                        )}
                    </>
                 )}
            </div>
        </>
    );
};

export default ProfileTabs;
