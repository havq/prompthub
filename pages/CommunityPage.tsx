
import React, { useState, useEffect, useMemo, useCallback } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import {
    getPrompts,
    getTopContributors,
    getUserProfile,
    updateUserProfile,
    getCategories,
    getCommentCounts,
    getCollections,
    createCollection,
    togglePromptInCollection,
    getAllShowcaseImageCounts,
    addShowcaseImage,
    updatePrompt,
    deletePrompt as apiDeletePrompt,
    getCombinedRatings,
    saveRating
} from '../services/api';
import { getFavorites, toggleFavorite } from '../services/favoriteService';
import { Prompt, UserProfile, Badge, CategoryWithCount, Collection, TopContributor } from '../utils/types';
import Spinner from '../components/Spinner';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { transformCloudinaryUrl } from '../services/cloudinaryUtils';
import { calculateLevel } from '../services/gamificationService';

// Modals
import { PromptDetailModal } from '../components/PromptDetailModal';
import SimilarPromptsModal from '../components/SimilarPromptsModal';
import ReportModal from '../components/ReportModal';
import RemixPromptModal from '../components/RemixPromptModal';
import AddToCollectionModal from '../components/AddToCollectionModal';
import ShowcaseUploadModal from '../components/ShowcaseUploadModal';
import { PromptForm } from '../components/PromptForm';
import ConfirmModal from '../components/ConfirmModal';
import LoginSuggestionModal from '../components/LoginSuggestionModal';


interface PopularPrompt extends Prompt {
    collectionCount: number;
}

interface RatedPrompt extends Prompt {
    averageRating: number;
    ratingCount: number;
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
    const truncatedValue = Math.floor(value * 10) / 10;
    
    return String(truncatedValue) + units[unit];
};

const RankIcon: React.FC<{ rank: number }> = ({ rank }) => {
    const colors: { [key: number]: string } = {
        1: 'text-amber-400',
        2: 'text-slate-400',
        3: 'text-amber-600',
    };
    const size: { [key: number]: string } = {
        1: 'w-8 h-8',
        2: 'w-7 h-7',
        3: 'w-6 h-6',
    }
    if (rank > 3) {
        return <span className="font-bold text-lg text-gray-500 dark:text-gray-400 w-8 text-center">#{rank}</span>;
    }
    return (
        <div className={`relative ${size[rank]}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={colors[rank]}>
                <path fillRule="evenodd" d="M15.195 6.044c-1.129-.19-1.782-1.35-1.9-2.502-.128-1.234-1.282-2.29-2.5-2.29s-2.372 1.056-2.5 2.29c-.118 1.152-.771 2.312-1.9 2.502-1.235.207-2.29 1.282-2.29 2.5v.456c0 1.218 1.055 2.29 2.29 2.502 1.129.19 1.782 1.35 1.9 2.502.128 1.234 1.282 2.29 2.5 2.29s2.372-1.056 2.5-2.29c.118 1.152.771 2.312 1.9-2.502 1.235-.207 2.29-1.282 2.29-2.5v-.456c0-1.218-1.055-2.29-2.29-2.502z" clipRule="evenodd" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">{rank}</span>
        </div>
    );
};

const getImageUrls = (imageUrlValue: string | undefined): string[] => {
    if (!imageUrlValue) return [];
    if (imageUrlValue.startsWith('[') && imageUrlValue.endsWith(']')) {
        try {
            const parsed = JSON.parse(imageUrlValue);
            if (Array.isArray(parsed)) {
                return parsed.filter(url => typeof url === 'string' && url.length > 0);
            }
        } catch (e) {
            // Not a valid JSON array, treat as a single URL string
        }
    }
    return [imageUrlValue];
};


export const CommunityPage: React.FC = () => {
    const { currentUser, userProfile, isAdmin, isPro } = useAuth();
    const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { t } = useLanguage();
    
    const [topRatedSort, setTopRatedSort] = useState<'average' | 'count' | 'viewed'>('count');
    
    const [categories, setCategories] = useState<CategoryWithCount[]>([]);
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [collections, setCollections] = useState<Collection[]>([]);
    const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
    const [showcaseCounts, setShowcaseCounts] = useState<Record<string, number>>({});
    const [allPrompts, setAllPrompts] = useState<Prompt[]>([]);
    const [averageRatings, setAverageRatings] = useState<Record<string, { average: number; count: number }>>({});
    
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const [sourcePromptForModal, setSourcePromptForModal] = useState<Prompt | null>(null);
    const [reportingPrompt, setReportingPrompt] = useState<Prompt | null>(null);
    const [promptToRemix, setPromptToRemix] = useState<Prompt | null>(null);
    const [promptForCollections, setPromptForCollections] = useState<Prompt | null>(null);
    const [promptForShowcase, setPromptForShowcase] = useState<Prompt | null>(null);
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
    const [deletingPrompt, setDeletingPrompt] = useState<Prompt | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // OPTIMIZATION: Use getCombinedRatings and getCommentCounts
            const [promptsResponse, contributorsData, combinedRatingsData, categoriesData, favoritesData, collectionsData, commentCountsData, showcaseData] = await Promise.all([
                getPrompts({ page: 1, limit: 10000, sortBy: 'newest' }),
                getTopContributors(),
                getCombinedRatings(currentUser?.uid),
                getCategories(),
                getFavorites(currentUser),
                getCollections(currentUser),
                getCommentCounts(),
                getAllShowcaseImageCounts(),
            ]);
            
            setAllPrompts(promptsResponse.prompts);
            setTopContributors(contributorsData);
            
            setAverageRatings(combinedRatingsData.averageRatings);
            setRatings(combinedRatingsData.userRatings);
            
            setCategories(categoriesData);
            setFavorites(favoritesData);
            setCollections(collectionsData);
            setShowcaseCounts(showcaseData);
            
            setCommentCounts(commentCountsData);

        } catch (error) {
            console.error("Failed to fetch community data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const publicPrompts = useMemo(() => allPrompts.filter(p => !p.isPrivate), [allPrompts]);

    const popularPrompts = useMemo<PopularPrompt[]>(() => {
        return publicPrompts
            .filter(p => p.viewCount && p.viewCount > 0)
            .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, 10)
            .map(p => ({ ...p, collectionCount: 0 }));
    }, [publicPrompts]);

    const topRatedByAverage = useMemo<RatedPrompt[]>(() => {
        return publicPrompts
            .map(p => ({
                ...p,
                averageRating: averageRatings[p.id]?.average || 0,
                ratingCount: averageRatings[p.id]?.count || 0,
            }))
            .filter(p => p.ratingCount > 0)
            .sort((a, b) => b.averageRating - a.averageRating)
            .slice(0, 10);
    }, [publicPrompts, averageRatings]);

    const topRatedByVotes = useMemo<RatedPrompt[]>(() => {
        return publicPrompts
            .map(p => ({
                ...p,
                averageRating: averageRatings[p.id]?.average || 0,
                ratingCount: averageRatings[p.id]?.count || 0,
            }))
            .filter(p => p.ratingCount > 0)
            .sort((a, b) => b.ratingCount - a.ratingCount || b.averageRating - a.averageRating)
            .slice(0, 10);
    }, [publicPrompts, averageRatings]);
    
    const mostViewedPrompts = useMemo<RatedPrompt[]>(() => {
        return publicPrompts
            .filter(p => p.viewCount && p.viewCount > 0)
            .sort((a,b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, 10)
            .map(p => ({
                ...p,
                averageRating: averageRatings[p.id]?.average || 0,
                ratingCount: averageRatings[p.id]?.count || 0,
            }));
    }, [publicPrompts, averageRatings]);


    useEffect(() => {
        // Only admins can run the logic to update/award badges based on stats
        if (!isAdmin) return;

        if (isLoading || (popularPrompts.length === 0 && topRatedByAverage.length === 0)) {
            return;
        }
    
        const awardLeaderboardBadges = async () => {
            const authorsToUpdate = new Map<string, Set<Badge>>();
    
            const processList = (list: Prompt[], badge: Badge) => {
                list.forEach(prompt => {
                    if (prompt.authorId) {
                        if (!authorsToUpdate.has(prompt.authorId)) {
                            authorsToUpdate.set(prompt.authorId, new Set());
                        }
                        authorsToUpdate.get(prompt.authorId)!.add(badge);
                    }
                });
            };
    
            processList(popularPrompts, 'community-favorite');
            processList(topRatedByAverage, 'top-rated');
    
            for (const [authorId, newBadges] of authorsToUpdate.entries()) {
                try {
                    const profile = await getUserProfile(authorId);
                    if (profile) {
                        const currentBadges = new Set(profile.badges || []);
                        const originalCount = currentBadges.size;
                        newBadges.forEach(b => currentBadges.add(b));
    
                        if (currentBadges.size > originalCount) {
                            await updateUserProfile(authorId, { badges: Array.from(currentBadges) });
                        }
                    }
                } catch (error) {
                    console.error(`Failed to update badges for user ${authorId}:`, error);
                }
            }
        };
    
        awardLeaderboardBadges();
    }, [isLoading, popularPrompts, topRatedByAverage, isAdmin]);

    const handleRatePrompt = async (prompt: Prompt, newRating: number) => {
        if (!currentUser || !userProfile) {
            setIsLoginModalOpen(true);
            return;
        }
        
        setRatings(prev => ({...prev, [prompt.id]: newRating}));

        await saveRating(prompt, newRating, userProfile);
        
        const combinedData = await getCombinedRatings(currentUser.uid);
        setRatings(combinedData.userRatings);
        setAverageRatings(combinedData.averageRatings);
    };

    const handleToggleFavorite = async (prompt: Prompt) => {
        const newFavorites = await toggleFavorite(prompt.id, currentUser, prompt.authorId);
        setFavorites(newFavorites);
    };

    const updateCommentCount = useCallback((promptId: string, change: 1 | -1) => {
        setCommentCounts(prev => ({ ...prev, [promptId]: (prev[promptId] || 0) + change }));
    }, []);
    
    const updateShowcaseCount = useCallback((promptId: string, change: 1 | -1) => {
        setShowcaseCounts(prev => ({ ...prev, [promptId]: Math.max(0, (prev[promptId] || 0) + change) }));
    }, []);

    const handleRemixSuccess = () => {
        setPromptToRemix(null);
        fetchData();
    };
    
    const handleShowcaseSubmit = async (imageUrl: string) => {
        if (!promptForShowcase || !currentUser || !userProfile) return;
        await addShowcaseImage({
            promptId: promptForShowcase.id,
            userId: currentUser.uid,
            username: userProfile.username,
            userPhotoURL: userProfile.photoURL,
            imageUrl,
        });
        setShowcaseCounts(prev => ({...prev, [promptForShowcase.id]: (prev[promptForShowcase.id] || 0) + 1}));
    };
    
    const handleCreateCollection = async (name: string) => {
        const updatedCollections = await createCollection(currentUser, name);
        setCollections(updatedCollections);
    };

    const handleToggleInCollection = async (promptId: string, collectionId: string) => {
        const updatedCollections = await togglePromptInCollection(currentUser, promptId, collectionId);
        setCollections(updatedCollections);
    };

    const handleEditPrompt = (prompt: Prompt) => {
        setSelectedPrompt(null);
        setEditingPrompt(prompt);
    };

    const handleDeletePrompt = (prompt: Prompt) => {
        setDeletingPrompt(prompt);
    };

    const handlePromptFormSubmit = async (formData: Omit<Prompt, 'id' | 'createdAt'> | Prompt) => {
        setIsActionLoading(true);
        try { if ('id' in formData) await updatePrompt(formData); await fetchData(); setEditingPrompt(null); } 
        catch (error) { console.error("Failed to submit prompt:", error); } finally { setIsActionLoading(false); }
    };
    
    const handleConfirmDelete = async () => {
        if (!deletingPrompt) return;
        setIsActionLoading(true);
        try {
            await apiDeletePrompt(deletingPrompt.id);
            if (selectedPrompt?.id === deletingPrompt.id) {
                setSelectedPrompt(null);
            }
            setDeletingPrompt(null);
            await fetchData();
        } catch (error) { console.error("Failed to delete prompt:", error); } 
        finally { setIsActionLoading(false); }
    };


    const LeaderboardCard: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{title}</h2>
            <div className="space-y-4">{children}</div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <Spinner size="lg" />
                <p className="text-xl text-gray-700 dark:text-gray-300">{t('common.loading')}</p>
            </div>
        );
    }

    const promptsToDisplayInTopRated = topRatedSort === 'average' ? topRatedByAverage : topRatedSort === 'count' ? topRatedByVotes : mostViewedPrompts;

    return (
        <>
            {isLoginModalOpen && <LoginSuggestionModal onClose={() => setIsLoginModalOpen(false)} />}
            {editingPrompt && <PromptForm initialData={editingPrompt} categories={categories} users={[]} onSubmit={handlePromptFormSubmit} onClose={() => setEditingPrompt(null)} isSubmitting={isActionLoading} isUserAdmin={isAdmin} isPro={isPro} />}
            {deletingPrompt && <ConfirmModal isOpen={!!deletingPrompt} onClose={() => setDeletingPrompt(null)} onConfirm={handleConfirmDelete} title={t('modals.confirmDeleteTitle')} message={t('admin.prompts.deletePromptConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            {selectedPrompt && <PromptDetailModal prompt={selectedPrompt} categories={categories} onClose={() => setSelectedPrompt(null)} userRating={ratings[selectedPrompt.id] || 0} onRate={handleRatePrompt} isFavorite={favorites.has(selectedPrompt.id)} onToggleFavorite={() => handleToggleFavorite(selectedPrompt)} averageRating={(averageRatings[selectedPrompt.id] || { average: 0 }).average} ratingCount={(averageRatings[selectedPrompt.id] || { count: 0 }).count} onFindSimilar={(p) => setSourcePromptForModal(p)} onCommentUpdate={updateCommentCount} onShowcaseUpdate={updateShowcaseCount} onReport={(p) => setReportingPrompt(p)} onRemix={(p) => setPromptToRemix(p)} onAddToCollection={(p) => setPromptForCollections(p)} onUploadShowcase={(p) => setPromptForShowcase(p)} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} canManage={isAdmin || (currentUser && selectedPrompt.authorId === currentUser.uid)} />}
            {sourcePromptForModal && <SimilarPromptsModal sourcePrompt={sourcePromptForModal} allPrompts={allPrompts} categories={categories} onClose={() => setSourcePromptForModal(null)} onFindSimilar={(p) => setSourcePromptForModal(p)} ratings={ratings} averageRatings={averageRatings} onRatePrompt={handleRatePrompt} favorites={favorites} onToggleFavorite={handleToggleFavorite} commentCounts={commentCounts} onPromptClick={(p) => { setSelectedPrompt(p); setSourcePromptForModal(null); }} onReport={(p) => setReportingPrompt(p)} onRemix={(p) => setPromptToRemix(p)} onAddToCollection={(p) => setPromptForCollections(p)} showcaseCounts={showcaseCounts} onUploadShowcase={(p) => setPromptForShowcase(p)} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} />}
            {reportingPrompt && <ReportModal prompt={reportingPrompt} onClose={() => setReportingPrompt(null)} />}
            {promptToRemix && currentUser && userProfile && <RemixPromptModal promptToRemix={promptToRemix} onClose={() => setPromptToRemix(null)} onSubmitSuccess={handleRemixSuccess} categories={categories} currentUser={currentUser} userProfile={userProfile} isPro={isPro} />}
            {promptForCollections && <AddToCollectionModal prompt={promptForCollections} userCollections={collections} onClose={() => setPromptForCollections(null)} onCreate={handleCreateCollection} onToggle={handleToggleInCollection} />}
            {promptForShowcase && <ShowcaseUploadModal prompt={promptForShowcase} onClose={() => setPromptForShowcase(null)} onSubmit={handleShowcaseSubmit} />}

            <div className="space-y-8">
                 <div>
                    <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-2">{t('community.title')}</h1>
                    <p className="text-lg text-center text-gray-600 dark:text-gray-400">{t('community.subtitle')}</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <LeaderboardCard title={t('community.topContributors')}>
                        {topContributors.length > 0 ? topContributors.map((user, index) => {
                            const levelInfo = calculateLevel(user.points);
                            return (
                                <Link to={`/author/${user.uid}`} key={user.uid} className="flex items-center space-x-4 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <RankIcon rank={index + 1} />
                                    <img src={transformCloudinaryUrl(user.photoURL || '', 'w_150,h_150,c_fill,g_auto') || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user.username)}`} alt={user.username} className="w-12 h-12 rounded-full object-cover bg-gray-200 dark:bg-gray-600"/>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 dark:text-white truncate">{user.username}</p>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-bold text-amber-500">Lv. {levelInfo.level}</span>
                                            <span className="text-gray-500 dark:text-gray-400">{t('community.points', { count: formatCount(user.points) })}</span>
                                        </div>
                                    </div>
                                </Link>
                            )
                        }) : <p className="text-gray-500 dark:text-gray-400">{t('community.noData')}</p>}
                    </LeaderboardCard>
                    <LeaderboardCard title={t('community.mostPopular')}>
                        {popularPrompts.length > 0 ? popularPrompts.map((prompt, index) => (
                            <button onClick={() => setSelectedPrompt(prompt)} key={prompt.id} className="w-full text-left flex items-center space-x-4 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <RankIcon rank={index + 1} />
                                <img src={transformCloudinaryUrl(getImageUrls(prompt.imageUrl)[0] || '', 'w_150,h_150,c_fill,g_auto')} alt={prompt.text.substring(0,20)} className="w-12 h-12 rounded-md object-cover flex-shrink-0"/>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800 dark:text-white truncate-2-lines">{prompt.text}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('community.views', { count: formatCount(prompt.viewCount) })}</p>
                                </div>
                            </button>
                        )) : <p className="text-gray-500 dark:text-gray-400">{t('community.noData')}</p>}
                    </LeaderboardCard>
                     <LeaderboardCard title={t('community.topRated')}>
                        <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                            <button onClick={() => setTopRatedSort('count')} className={`flex-1 text-center text-xs font-semibold py-1.5 rounded-md transition-colors ${topRatedSort === 'count' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{t('community.mostVotes')}</button>                        
                            <button onClick={() => setTopRatedSort('average')} className={`flex-1 text-center text-xs font-semibold py-1.5 rounded-md transition-colors ${topRatedSort === 'average' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{t('community.highestRating')}</button>
                        </div>
                        {promptsToDisplayInTopRated.length > 0 ? promptsToDisplayInTopRated.map((prompt, index) => (
                            <button onClick={() => setSelectedPrompt(prompt)} key={prompt.id} className="w-full text-left flex items-center space-x-4 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <RankIcon rank={index + 1} />
                                <img src={transformCloudinaryUrl(getImageUrls(prompt.imageUrl)[0] || '', 'w_150,h_150,c_fill,g_auto')} alt={prompt.text.substring(0,20)} className="w-12 h-12 rounded-md object-cover flex-shrink-0"/>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800 dark:text-white truncate-2-lines">{prompt.text}</p>
                                    <p className="text-xs text-yellow-500 dark:text-yellow-400 font-semibold">{t('community.rating', { rating: prompt.averageRating.toFixed(2), count: formatCount(prompt.ratingCount) })}</p>
                                </div>
                            </button>
                        )) : <p className="text-gray-500 dark:text-gray-400">{t('community.noData')}</p>}
                    </LeaderboardCard>
                </div>
            </div>
        </>
    );
};
