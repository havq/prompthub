
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    getPrompts, getCategories, getCommentCounts, getCollections, createCollection, updateCollection, deleteCollection, togglePromptInCollection,
    getAllShowcaseImageCounts, addShowcaseImage, updatePrompt, deletePrompt as apiDeletePrompt, getCombinedRatings, saveRating, getAllComments
} from '../services/api';
import { getFavorites, toggleFavorite } from '../services/favoriteService';
import { useLanguage } from '../context/LanguageContext';

// FIX: Changed 'Category' to 'CategoryWithCount' to match data structure from API and satisfy child component props.
import { Prompt, CategoryWithCount, Collection, UserProfile } from '../utils/types';

import PromptCard from '../components/PromptCard';
import PromptCardSkeleton from '../components/PromptCardSkeleton';
import { PromptDetailModal } from '../components/PromptDetailModal';
import SimilarPromptsModal from '../components/SimilarPromptsModal';
import ReportModal from '../components/ReportModal';
import RemixPromptModal from '../components/RemixPromptModal';
import AddToCollectionModal from '../components/AddToCollectionModal';
import ShowcaseUploadModal from '../components/ShowcaseUploadModal';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import { PromptForm } from '../components/PromptForm';
import LoginSuggestionModal from '../components/LoginSuggestionModal';

const CollectionsPageSkeleton: React.FC = () => (
    <div className="space-y-8 animate-pulse">
        <div>
            <div className="h-10 w-1/2 bg-gray-300 dark:bg-gray-700 rounded mx-auto mb-3"></div>
            <div className="h-6 w-3/4 bg-gray-300 dark:bg-gray-700 rounded mx-auto"></div>
        </div>
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="h-10 w-1/3 bg-gray-300 dark:bg-gray-700 rounded mx-auto"></div>
            <div className="flex justify-center gap-4 h-12">
                <div className="w-32 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                <div className="w-24 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                <div className="w-28 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            </div>
            <div className="mt-6">
                <div className="h-8 w-1/4 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => <PromptCardSkeleton key={i} />)}
                </div>
            </div>
        </div>
    </div>
);

const CollectionsPage: React.FC = () => {
    // FIX: Removed `ratePrompt` as it does not exist on the AuthContext.
    const { currentUser, userProfile, isAdmin, isPro } = useAuth();
    const prevUserRef = useRef(currentUser);
    useEffect(() => {
        prevUserRef.current = currentUser;
    });

    const { t, tComponent } = useLanguage();

    // Data state
    const [collections, setCollections] = useState<Collection[]>([]);
    const [allPrompts, setAllPrompts] = useState<Prompt[]>([]);
    // FIX: Renamed folders state to categories and updated type to CategoryWithCount.
    const [categories, setCategories] = useState<CategoryWithCount[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Interaction state (for PromptCard)
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [averageRatings, setAverageRatings] = useState<Record<string, { average: number; count: number }>>({});
    const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
    const [showcaseCounts, setShowcaseCounts] = useState<Record<string, number>>({});

    // Modal state
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const [sourcePromptForModal, setSourcePromptForModal] = useState<Prompt | null>(null);
    const [reportingPrompt, setReportingPrompt] = useState<Prompt | null>(null);
    const [promptToRemix, setPromptToRemix] = useState<Prompt | null>(null);
    const [promptForCollections, setPromptForCollections] = useState<Prompt | null>(null);
    const [promptForShowcase, setPromptForShowcase] = useState<Prompt | null>(null);

    // Collection management state
    const [newCollectionName, setNewCollectionName] = useState('');
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
    const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null);
    const [isCollectionOpLoading, setIsCollectionOpLoading] = useState(false);
    const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

    // Prompt editing state
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
    const [deletingPrompt, setDeletingPrompt] = useState<Prompt | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    // FIX: Add missing state for modals.
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [users, setUsers] = useState<UserProfile[]>([]);


    const fetchData = useCallback(async () => {
        const isLoggingOut = !!prevUserRef.current && !currentUser;
        if (isLoggingOut) {
            setCollections([]);
            setFavorites(new Set());
            setRatings({});
            setActiveCollectionId(null);
            return;
        }

        setIsLoading(true);
        try {
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
            setCategories(categoryData);
            setFavorites(favoritesData);
            
            setRatings(combinedRatingsData.userRatings);
            setAverageRatings(combinedRatingsData.averageRatings);
            
            setCollections(collectionsData);
            setShowcaseCounts(showcaseData);

            if (collectionsData.length > 0 && !activeCollectionId) {
                setActiveCollectionId(collectionsData[0].id);
            } else if (collectionsData.length === 0) {
                setActiveCollectionId(null);
            }

            setCommentCounts(commentCountsData);

        } catch (err) {
            console.error("Failed to fetch collections data:", err);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, activeCollectionId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const activeCollection = useMemo(() => {
        return collections.find(c => c.id === activeCollectionId);
    }, [collections, activeCollectionId]);

    const activeCollectionPrompts = useMemo(() => {
        if (!activeCollection) return [];
        return allPrompts.filter(p => activeCollection.promptIds?.[p.id]);
    }, [allPrompts, activeCollection]);

    // --- Collection Management Handlers ---
    const handleNewCollectionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCollectionName.trim() || isCollectionOpLoading) return;
        setIsCollectionOpLoading(true);
        try {
            const updatedCollections = await createCollection(currentUser, newCollectionName);
            setCollections(updatedCollections);
            // Switch to the newly created collection
            const newCollection = updatedCollections.find(c => c.name === newCollectionName && !collections.some(oc => oc.id === c.id));
            if(newCollection) setActiveCollectionId(newCollection.id);
            setNewCollectionName('');
        } catch (err) { console.error(err); } finally { setIsCollectionOpLoading(false); }
    };

    const handleConfirmDeleteCollection = async () => {
        if (!deletingCollection || isCollectionOpLoading) return;
        setIsCollectionOpLoading(true);
        try {
            const updatedCollections = await deleteCollection(currentUser, deletingCollection.id);
            setCollections(updatedCollections);
            setDeletingCollection(null);
            if (activeCollectionId === deletingCollection.id) {
                setActiveCollectionId(updatedCollections[0]?.id || null);
            }
        } catch (err) { console.error(err); } finally { setIsCollectionOpLoading(false); }
    };

    const handleUpdateCollectionName = async () => {
        if (!editingCollection || !editingCollection.name.trim() || isCollectionOpLoading) return;
        setIsCollectionOpLoading(true);
        try {
            const updatedCollections = await updateCollection(currentUser, editingCollection.id, editingCollection.name);
            setCollections(updatedCollections);
            setEditingCollection(null);
        } catch (err) { console.error(err); } finally { setIsCollectionOpLoading(false); }
    };
    
    const handleToggleInCollection = async (promptId: string, collectionId: string) => {
        const updatedCollections = await togglePromptInCollection(currentUser, promptId, collectionId);
        setCollections(updatedCollections);
    };
    
    // --- Prompt Card Interaction Handlers ---
    const handleToggleFavorite = async (prompt: Prompt) => {
        // FIX: Pass current favorites state to avoid re-fetching from server
        const newFavorites = await toggleFavorite(prompt.id, currentUser, prompt.authorId, favorites);
        setFavorites(newFavorites);
    };

    // FIX: Add missing handlers to resolve 'Cannot find name' errors in JSX.
    const handleRatePrompt = async (prompt: Prompt, newRating: number) => {
        if (!currentUser || !userProfile) { setIsLoginModalOpen(true); return; }
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
            if ('id' in formData) {
                await updatePrompt(formData);
                await fetchData();
                setEditingPrompt(null);
            }
        } catch (error) {
            console.error("Failed to submit prompt:", error);
            alert("An error occurred while saving the prompt.");
        } finally {
            setIsActionLoading(false);
        }
    };
    
    const handleConfirmDeletePrompt = async () => {
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

    if (isLoading) {
        return <CollectionsPageSkeleton />;
    }

    return (
        <>
            {/* All the modals */}
            {isLoginModalOpen && <LoginSuggestionModal onClose={() => setIsLoginModalOpen(false)} />}
            {/* FIX: Changed 'folders' prop to 'categories'. */}
            {editingPrompt && <PromptForm initialData={editingPrompt} categories={categories} users={users} onSubmit={handlePromptFormSubmit} onClose={() => setEditingPrompt(null)} isSubmitting={isActionLoading} isUserAdmin={isAdmin} isPro={!!isPro} />}
            {deletingPrompt && <ConfirmModal isOpen={!!deletingPrompt} onClose={() => setDeletingPrompt(null)} onConfirm={handleConfirmDeletePrompt} title={t('modals.confirmDeleteTitle')} message={t('admin.prompts.deletePromptConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            {selectedPrompt && <PromptDetailModal prompt={selectedPrompt} categories={categories} onClose={() => setSelectedPrompt(null)} userRating={ratings[selectedPrompt.id] || 0} onRate={handleRatePrompt} isFavorite={favorites.has(selectedPrompt.id)} onToggleFavorite={() => handleToggleFavorite(selectedPrompt)} averageRating={(averageRatings[selectedPrompt.id] || { average: 0 }).average} ratingCount={(averageRatings[selectedPrompt.id] || { count: 0 }).count} onFindSimilar={(p) => setSourcePromptForModal(p)} onCommentUpdate={updateCommentCount} onShowcaseUpdate={updateShowcaseCount} onReport={(p) => setReportingPrompt(p)} onRemix={(p) => setPromptToRemix(p)} onAddToCollection={(p) => setPromptForCollections(p)} onUploadShowcase={(p) => setPromptForShowcase(p)} onRemoveFromCollection={() => activeCollection && handleToggleInCollection(selectedPrompt.id, activeCollection.id)} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} canManage={isAdmin || (currentUser && selectedPrompt.authorId === currentUser.uid)} />}
            {sourcePromptForModal && <SimilarPromptsModal sourcePrompt={sourcePromptForModal} allPrompts={allPrompts} categories={categories} onClose={() => setSourcePromptForModal(null)} onFindSimilar={(p) => setSourcePromptForModal(p)} ratings={ratings} averageRatings={averageRatings} onRatePrompt={handleRatePrompt} favorites={favorites} onToggleFavorite={handleToggleFavorite} commentCounts={commentCounts} onPromptClick={(p) => { setSelectedPrompt(p); setSourcePromptForModal(null); }} onReport={(p) => setReportingPrompt(p)} onRemix={(p) => setPromptToRemix(p)} onAddToCollection={(p) => setPromptForCollections(p)} showcaseCounts={showcaseCounts} onUploadShowcase={(p) => setPromptForShowcase(p)} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} />}
            {reportingPrompt && <ReportModal prompt={reportingPrompt} onClose={() => setReportingPrompt(null)} />}
            {promptToRemix && currentUser && userProfile && <RemixPromptModal promptToRemix={promptToRemix} onClose={() => setPromptToRemix(null)} onSubmitSuccess={handleRemixSuccess} categories={categories} currentUser={currentUser} userProfile={userProfile} isPro={!!isPro} />}
            {promptForCollections && <AddToCollectionModal prompt={promptForCollections} userCollections={collections} onClose={() => setPromptForCollections(null)} onCreate={handleCreateCollection} onToggle={handleToggleInCollection} />}
            {promptForShowcase && <ShowcaseUploadModal prompt={promptForShowcase} onClose={() => setPromptForShowcase(null)} onSubmit={handleShowcaseSubmit} />}
            {deletingCollection && <ConfirmModal isOpen={!!deletingCollection} onClose={() => setDeletingCollection(null)} onConfirm={handleConfirmDeleteCollection} title={t('common.delete')} message={t('profile.deleteCollectionConfirm', { name: deletingCollection.name })} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isCollectionOpLoading} />}

            <div className="space-y-8">
                <div>
                    <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-2">{t('collectionsPage.title')}</h1>
                    <p className="text-lg text-center text-gray-600 dark:text-gray-400">{t('collectionsPage.subtitle')}</p>
                </div>

                <div className="max-w-6xl mx-auto space-y-6">
                    <form onSubmit={handleNewCollectionSubmit} className="flex items-center gap-2 max-w-sm mx-auto">
                        <input type="text" value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} placeholder={t('profile.newCollection')} className="flex-grow bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600" required/>
                        <button type="submit" disabled={isCollectionOpLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors w-24 flex justify-center">{isCollectionOpLoading && !editingCollection ? <Spinner size="sm"/> : t('common.add')}</button>
                    </form>

                    {collections.length > 0 ? (
                        <>
                            <div className="border-b border-gray-200 dark:border-gray-700">
                                <nav className="-mb-px flex space-x-4 overflow-x-auto scrollbar-hide" aria-label="Tabs">
                                    {collections.map(collection => (
                                        <button
                                            key={collection.id}
                                            onClick={() => setActiveCollectionId(collection.id)}
                                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeCollectionId === collection.id
                                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            {collection.name} ({Object.keys(collection.promptIds || {}).length})
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="mt-6">
                                {activeCollection ? (
                                    <div className="space-y-6">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            {editingCollection?.id === activeCollection.id ? (
                                                <div className="flex items-center gap-2 flex-grow">
                                                    {/* FIX: Replaced handleUpdateName with handleUpdateCollectionName. */}
                                                    <input type="text" value={editingCollection.name} onChange={(e) => setEditingCollection({...editingCollection, name: e.target.value})} onBlur={handleUpdateCollectionName} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateCollectionName(); if(e.key === 'Escape') setEditingCollection(null); }} className="text-2xl font-bold bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-2 py-1 -ml-2" autoFocus/>
                                                </div>
                                            ) : (
                                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{activeCollection.name}</h2>
                                            )}
                                            <div className="flex items-center space-x-4 flex-shrink-0">
                                                <button onClick={() => setEditingCollection(activeCollection)} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">{t('profile.rename')}</button>
                                                <button onClick={() => setDeletingCollection(activeCollection)} className="text-red-600 dark:text-red-400 hover:underline text-sm font-medium">{t('common.delete')}</button>
                                            </div>
                                        </div>
                                        
                                        {activeCollectionPrompts.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                                {activeCollectionPrompts.map(prompt => (
                                                    <PromptCard key={prompt.id} prompt={prompt} categories={categories} onFindSimilar={(p) => setSourcePromptForModal(p)} userRating={ratings[prompt.id] || 0} onRate={handleRatePrompt} isFavorite={favorites.has(prompt.id)} onToggleFavorite={handleToggleFavorite} averageRating={(averageRatings[prompt.id] || { average: 0 }).average} ratingCount={(averageRatings[prompt.id] || { count: 0 }).count} commentCount={commentCounts[prompt.id] || 0} showcaseCount={showcaseCounts[prompt.id] || 0} viewCount={prompt.viewCount || 0} onClick={() => setSelectedPrompt(prompt)} onReport={(p) => setReportingPrompt(p)} onRemix={(p) => setPromptToRemix(p)} onAddToCollection={(p) => setPromptForCollections(p)} onUploadShowcase={(p) => setPromptForShowcase(p)} onRemoveFromCollection={() => handleToggleInCollection(prompt.id, activeCollection.id)} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} canManage={isAdmin || (currentUser && prompt.authorId === currentUser.uid)} />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg"><p className="text-gray-500 dark:text-gray-400">{tComponent('profile.noPromptsInCollection', { '1': (text) => <Link to="/" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{text}</Link> })}</p></div>
                                        )}
                                    </div>
                                ) : (
                                     <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg"><p className="text-gray-600 dark:text-gray-400">{t('profile.noCollections')}</p></div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <p className="text-gray-600 dark:text-gray-400">
                                {t('profile.noCollections')}
                                {!currentUser && ` ${t('profile.noCollectionsGuestHint')}`}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default CollectionsPage;
