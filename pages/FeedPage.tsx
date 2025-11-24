
import React, { useState, useEffect, useMemo, useCallback } from 'react';
// FIX: Replaced 'getFolders' with 'getCategories' and imported `getAllComments`.
import { getPrompts, getCategories, getCollections, createCollection, togglePromptInCollection, getAllComments, getAllShowcaseImageCounts, addShowcaseImage, updatePrompt, deletePrompt as apiDeletePrompt, addPrompt as apiAddPrompt, getCombinedRatings, saveRating, getCommentCounts } from '../services/api';
// FIX: Changed 'Folder' type with 'Category' and then to 'CategoryWithCount' for compatibility with `PromptForm`.
import { Prompt, CategoryWithCount, Collection } from '../utils/types';
import PromptCard from '../components/PromptCard';
import { getFavorites, toggleFavorite } from '../services/favoriteService';
import { PromptDetailModal } from '../components/PromptDetailModal';
import SimilarPromptsModal from '../components/SimilarPromptsModal';
import ReportModal from '../components/ReportModal';
import RemixPromptModal from '../components/RemixPromptModal';
import AddToCollectionModal from '../components/AddToCollectionModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Spinner from '../components/Spinner';
// @ts-ignore
import { Link } from 'react-router-dom';
import ShowcaseUploadModal from '../components/ShowcaseUploadModal';
import { PromptForm } from '../components/PromptForm';
import ConfirmModal from '../components/ConfirmModal';
import LoginSuggestionModal from '../components/LoginSuggestionModal';

export const FeedPage: React.FC = () => {
    const { currentUser, userProfile, isAdmin, isPro } = useAuth();
    const { t, tComponent } = useLanguage();

    const [allPrompts, setAllPrompts] = useState<Prompt[]>([]);
    // FIX: Renamed 'folders' state to 'categories' and updated type to CategoryWithCount.
    const [categories, setCategories] = useState<CategoryWithCount[]>([]);
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [averageRatings, setAverageRatings] = useState<Record<string, { average: number; count: number }>>({});
    const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
    const [showcaseCounts, setShowcaseCounts] = useState<Record<string, number>>({});
    const [collections, setCollections] = useState<Collection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
            // FIX: Replaced `getFolders()` with `getCategories()`.
            // OPTIMIZATION: Use getCombinedRatings and getCommentCounts
            const [promptsResponse, categoryData, favoritesData, combinedRatingsData, commentCountsData, collectionsData, showcaseData] = await Promise.all([
                getPrompts({ page: 1, limit: 10000, sortBy: 'newest' }),
                getCategories(),
                getFavorites(currentUser),
                getCombinedRatings(currentUser?.uid),
                getCommentCounts(),
                getCollections(currentUser),
                getAllShowcaseImageCounts(),
            ]);
            setAllPrompts(promptsResponse.prompts);
            // FIX: Set categories state instead of folders.
            setCategories(categoryData);
            setFavorites(favoritesData);
            
            setRatings(combinedRatingsData.userRatings);
            setAverageRatings(combinedRatingsData.averageRatings);
            
            setCollections(collectionsData);
            setShowcaseCounts(showcaseData);
            setCommentCounts(commentCountsData);

        } catch (err) {
            console.error("Failed to fetch feed data:", err);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const feedPrompts = useMemo(() => {
        if (!userProfile?.following) return [];
        const followingIds = Object.keys(userProfile.following);
        return allPrompts
            .filter(p => !p.isPrivate && followingIds.includes(p.authorId || ''))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allPrompts, userProfile]);

    const handleToggleFavorite = async (prompt: Prompt) => {
        // FIX: Pass current favorites state to avoid re-fetching from server
        const newFavorites = await toggleFavorite(prompt.id, currentUser, prompt.authorId, favorites);
        setFavorites(newFavorites);
    };

    const handleRatePrompt = async (prompt: Prompt, newRating: number) => {
        if (!currentUser || !userProfile) return;
        
        await saveRating(prompt, newRating, userProfile);
        
        const combinedData = await getCombinedRatings(currentUser.uid);
        setRatings(combinedData.userRatings);
        setAverageRatings(combinedData.averageRatings);
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
        setSourcePromptForModal(null);
        setEditingPrompt(prompt);
    };

    const handleDeletePrompt = (prompt: Prompt) => {
        setDeletingPrompt(prompt);
    };

    const handlePromptFormSubmit = async (formData: Omit<Prompt, 'id' | 'createdAt'> | Prompt) => {
        setIsActionLoading(true);
        try {
            if ('id' in formData) { // Editing
                await updatePrompt(formData);
                await fetchData(); // Refetch all data to ensure UI consistency
                setEditingPrompt(null);
            }
        } catch (error) {
            console.error("Failed to submit prompt:", error);
            alert("An error occurred while saving the prompt.");
        } finally {
            setIsActionLoading(false);
        }
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
        } catch (error) {
            console.error("Failed to delete prompt:", error);
            alert("An error occurred while deleting the prompt.");
        } finally {
            setIsActionLoading(false);
        }
    };
    
    const handleRemixPrompt = (prompt: Prompt) => currentUser ? setPromptToRemix(prompt) : setIsLoginModalOpen(true);
    const handleAddToCollection = (prompt: Prompt) => currentUser ? setPromptForCollections(prompt) : setIsLoginModalOpen(true);
    const handleOpenShowcaseUpload = (prompt: Prompt) => currentUser ? setPromptForShowcase(prompt) : setIsLoginModalOpen(true);


    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <Spinner size="lg" />
                <p className="text-xl text-gray-700 dark:text-gray-300">{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <>
            {isLoginModalOpen && <LoginSuggestionModal onClose={() => setIsLoginModalOpen(false)} />}
            {editingPrompt && <PromptForm initialData={editingPrompt} categories={categories} users={[]} onSubmit={handlePromptFormSubmit} onClose={() => setEditingPrompt(null)} isSubmitting={isActionLoading} isUserAdmin={isAdmin} isPro={isPro} />}
            {deletingPrompt && <ConfirmModal isOpen={!!deletingPrompt} onClose={() => setDeletingPrompt(null)} onConfirm={handleConfirmDelete} title={t('modals.confirmDeleteTitle')} message={t('admin.prompts.deletePromptConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            {selectedPrompt && <PromptDetailModal prompt={selectedPrompt} categories={categories} onClose={() => setSelectedPrompt(null)} userRating={ratings[selectedPrompt.id] || 0} onRate={handleRatePrompt} isFavorite={favorites.has(selectedPrompt.id)} onToggleFavorite={() => handleToggleFavorite(selectedPrompt)} averageRating={(averageRatings[selectedPrompt.id] || { average: 0 }).average} ratingCount={(averageRatings[selectedPrompt.id] || { count: 0 }).count} onFindSimilar={(p) => setSourcePromptForModal(p)} onCommentUpdate={updateCommentCount} onShowcaseUpdate={updateShowcaseCount} onReport={(p) => setReportingPrompt(p)} onRemix={handleRemixPrompt} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} canManage={isAdmin || (currentUser && selectedPrompt.authorId === currentUser.uid)} />}
            {sourcePromptForModal && <SimilarPromptsModal sourcePrompt={sourcePromptForModal} allPrompts={allPrompts} categories={categories} onClose={() => setSourcePromptForModal(null)} onFindSimilar={(p) => setSourcePromptForModal(p)} ratings={ratings} averageRatings={averageRatings} onRatePrompt={handleRatePrompt} favorites={favorites} onToggleFavorite={handleToggleFavorite} commentCounts={commentCounts} onPromptClick={(p) => { setSelectedPrompt(p); setSourcePromptForModal(null); }} onReport={(p) => setReportingPrompt(p)} onRemix={handleRemixPrompt} onAddToCollection={handleAddToCollection} showcaseCounts={showcaseCounts} onUploadShowcase={handleOpenShowcaseUpload} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} />}
            {reportingPrompt && <ReportModal prompt={reportingPrompt} onClose={() => setReportingPrompt(null)} />}
            {promptToRemix && currentUser && userProfile && <RemixPromptModal promptToRemix={promptToRemix} onClose={() => setPromptToRemix(null)} onSubmitSuccess={handleRemixSuccess} categories={categories} currentUser={currentUser} userProfile={userProfile} isPro={isPro} />}
            {promptForCollections && <AddToCollectionModal prompt={promptForCollections} userCollections={collections} onClose={() => setPromptForCollections(null)} onCreate={handleCreateCollection} onToggle={handleToggleInCollection} />}
            {promptForShowcase && <ShowcaseUploadModal prompt={promptForShowcase} onClose={() => setPromptForShowcase(null)} onSubmit={handleShowcaseSubmit} />}

            <div className="space-y-8">
                <div>
                    <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-2">{t('feed.title')}</h1>
                    <p className="text-lg text-center text-gray-600 dark:text-gray-400">{t('feed.subtitle')}</p>
                </div>
                {feedPrompts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {feedPrompts.map(prompt => {
                            const avgRatingData = averageRatings[prompt.id] || { average: 0, count: 0 };
                            const canManage = isAdmin || (currentUser && prompt.authorId === currentUser.uid);
                            return (
                            <PromptCard 
                                key={prompt.id} prompt={prompt} categories={categories} 
                                onFindSimilar={(p) => setSourcePromptForModal(p)}
                                userRating={ratings[prompt.id] || 0}
                                onRate={handleRatePrompt}
                                isFavorite={favorites.has(prompt.id)}
                                onToggleFavorite={handleToggleFavorite}
                                averageRating={avgRatingData.average}
                                ratingCount={avgRatingData.count}
                                commentCount={commentCounts[prompt.id] || 0}
                                showcaseCount={showcaseCounts[prompt.id] || 0}
                                // FIX: Add missing viewCount prop to PromptCard.
                                viewCount={prompt.viewCount || 0}
                                onClick={() => setSelectedPrompt(prompt)}
                                onReport={(p) => setReportingPrompt(p)}
                                onRemix={handleRemixPrompt}
                                onAddToCollection={handleAddToCollection}
                                onUploadShowcase={handleOpenShowcaseUpload}
                                onEdit={handleEditPrompt}
                                onDelete={handleDeletePrompt}
                                canManage={canManage}
                            />
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">{t('feed.noPrompts.title')}</h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                            {tComponent('feed.noPrompts.message', {
                                '1': (text) => <Link to="/community" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{text}</Link>
                            })}
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};
