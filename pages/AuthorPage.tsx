
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// @ts-ignore
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Prompt, CategoryWithCount, Collection, ShowcaseImage, UserProfile } from '../utils/types';
import {
    getUserProfile, getPrompts, getCategories, getCommentCounts, getCollections, getAllShowcaseImageCounts, addShowcaseImage,
    getAllShowcaseImages, updatePrompt, deletePrompt as apiDeletePrompt, deleteShowcaseImage as apiDeleteShowcaseImage,
    getCombinedRatings, saveRating, createCollection, togglePromptInCollection, followUser, unfollowUser,
    getAllUsers, getAllComments
} from '../services/api';
import Spinner from '../components/Spinner';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileSidebar from '../components/profile/ProfileSidebar';
import UserPrompts from '../components/profile/UserPrompts';
import UserShowcase from '../components/profile/UserShowcase';

// Modals
import { PromptDetailModal } from '../components/PromptDetailModal';
import SimilarPromptsModal from '../components/SimilarPromptsModal';
import ReportModal from '../components/ReportModal';
import RemixPromptModal from '../components/RemixPromptModal';
import AddToCollectionModal from '../components/AddToCollectionModal';
import ShowcaseUploadModal from '../components/ShowcaseUploadModal';
import ConfirmModal from '../components/ConfirmModal';
import PhotoGalleryModal from '../components/PhotoGalleryModal';
import { PromptForm } from '../components/PromptForm';
import { uploadImage } from '../services/imageUploadService';
// FIX: Import useLanguage to resolve 'Cannot find name' error.
import { useLanguage } from '../context/LanguageContext';
// FIX: Add missing imports for getFavorites and toggleFavorite functions.
import { getFavorites, toggleFavorite } from '../services/favoriteService';
import LoginSuggestionModal from '../components/LoginSuggestionModal';

// FIX: Add missing `formatCount` utility function to format numbers with 'k', 'm', etc.
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

export const AuthorPage: React.FC = () => {
    const { authorId } = useParams<{ authorId: string }>();
    const { currentUser, userProfile: currentUserProfile, isAdmin, isPro, refetchUserProfile } = useAuth();
    const prevUserRef = useRef(currentUser);
    useEffect(() => {
        prevUserRef.current = currentUser;
    });

    const { t } = useLanguage();
    const navigate = useNavigate();

    const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);
    const [allPrompts, setAllPrompts] = useState<Prompt[]>([]);
    // FIX: Updated state to hold CategoryWithCount[] to satisfy PromptForm props.
    const [categories, setCategories] = useState<CategoryWithCount[]>([]);
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [averageRatings, setAverageRatings] = useState<Record<string, { average: number; count: number }>>({});
    const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
    const [showcaseCounts, setShowcaseCounts] = useState<Record<string, number>>({});
    const [allShowcaseImages, setAllShowcaseImages] = useState<ShowcaseImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const [sourcePromptForModal, setSourcePromptForModal] = useState<Prompt | null>(null);
    const [reportingPrompt, setReportingPrompt] = useState<Prompt | null>(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [promptToRemix, setPromptToRemix] = useState<Prompt | null>(null);
    const [activeTab, setActiveTab] = useState<'prompts' | 'showcase'>('prompts');
    
    const [collections, setCollections] = useState<Collection[]>([]);
    // FIX: Add missing state for modals that were causing 'Cannot find name' errors.
    const [promptForCollections, setPromptForCollections] = useState<Prompt | null>(null);
    const [promptForShowcase, setPromptForShowcase] = useState<Prompt | null>(null);
    const [galleryState, setGalleryState] = useState<{ open: boolean, index: number }>({ open: false, index: 0 });

    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
    const [deletingPrompt, setDeletingPrompt] = useState<Prompt | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const fetchData = useCallback(async () => {
        const isLoggingOut = !!prevUserRef.current && !currentUser;
        if (isLoggingOut) {
            setFavorites(new Set());
            setRatings({});
            setCollections([]);
            setIsFollowing(false);
            return;
        }

        if (!authorId) { setIsLoading(false); return; };
        setIsLoading(true);
        try {
            // OPTIMIZATION: Use getCombinedRatings and getCommentCounts
            const [profileData, promptsResponse, categoryData, favoritesData, combinedRatingsData, commentCountsData, collectionsData, showcaseData, allShowcaseImagesData] = await Promise.all([
                getUserProfile(authorId), 
                getPrompts({ page: 1, limit: 10000, sortBy: 'newest' }), 
                getCategories(),
                getFavorites(currentUser), 
                getCombinedRatings(currentUser?.uid), 
                getCommentCounts(),
                getCollections(currentUser), 
                getAllShowcaseImageCounts(), 
                getAllShowcaseImages(),
            ]);

            setAuthorProfile(profileData);
            setAllPrompts(promptsResponse.prompts);
            setCategories(categoryData);
            setFavorites(favoritesData);
            
            setRatings(combinedRatingsData.userRatings);
            setAverageRatings(combinedRatingsData.averageRatings);
            
            setCollections(collectionsData);
            setShowcaseCounts(showcaseData);
            setAllShowcaseImages(allShowcaseImagesData);
            setFollowerCount(profileData?.followerCount || 0);

            setCommentCounts(commentCountsData);

        } catch (err) {
            console.error("Failed to fetch author page data:", err);
        } finally {
            setIsLoading(false);
        }
    }, [authorId, currentUser]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (currentUserProfile && authorId) {
            setIsFollowing(!!currentUserProfile.following?.[authorId]);
        }
    }, [currentUserProfile, authorId]);

    const authorPrompts = useMemo(() => {
        if (!authorProfile) return [];
        return allPrompts
            .filter(p => !p.isPrivate && p.authorId === authorId)
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allPrompts, authorId, authorProfile]);
    
    const promptsCount = authorPrompts.length;

    const authorShowcaseImages = useMemo(() => {
        if (!authorId) return [];
        const promptsMap = new Map<string, Prompt>(allPrompts.map(p => [p.id, p]));
        return allShowcaseImages
            .filter(img => img.userId === authorId)
            .map(image => ({ ...image, promptText: promptsMap.get(image.promptId)?.text }));
    }, [allShowcaseImages, authorId, allPrompts]);
    
    const handleFollowToggle = async () => {
        if (!currentUser) { setIsLoginModalOpen(true); return; }
        if (!authorId || currentUser.uid === authorId || isFollowLoading) return;
    
        setIsFollowLoading(true);
        const originalFollowingState = isFollowing;
        const originalFollowerCount = followerCount;
    
        setIsFollowing(!originalFollowingState);
        setFollowerCount(prev => originalFollowingState ? Math.max(0, prev - 1) : prev + 1);
        
        try {
            if (originalFollowingState) {
                await unfollowUser(currentUser.uid, authorId);
            } else {
                await followUser(currentUser.uid, authorId);
            }
            await refetchUserProfile();
            const updatedAuthorProfile = await getUserProfile(authorId);
            if (updatedAuthorProfile) {
                setAuthorProfile(updatedAuthorProfile);
                setFollowerCount(updatedAuthorProfile.followerCount || 0);
            }
        } catch (error) {
            console.error("Failed to toggle follow state:", error);
            setIsFollowing(originalFollowingState);
            setFollowerCount(originalFollowerCount);
        } finally {
            setIsFollowLoading(false);
        }
    };

    const handleToggleFavorite = async (prompt: Prompt) => {
        // FIX: Pass current favorites state to avoid re-fetching from server
        const newFavorites = await toggleFavorite(prompt.id, currentUser, prompt.authorId, favorites);
        setFavorites(newFavorites);
    };

    const handleRatePrompt = async (prompt: Prompt, newRating: number) => {
        if (!currentUser || !currentUserProfile) { setIsLoginModalOpen(true); return; }
        await saveRating(prompt, newRating, currentUserProfile);
        const combinedData = await getCombinedRatings(currentUser.uid);
        setRatings(combinedData.userRatings);
        setAverageRatings(combinedData.averageRatings);
    };

    const updateCommentCount = useCallback((promptId: string, change: 1 | -1) => setCommentCounts(prev => ({ ...prev, [promptId]: (prev[promptId] || 0) + change })), []);
    const updateShowcaseCount = useCallback((promptId: string, change: 1 | -1) => {
        setShowcaseCounts(prev => ({ ...prev, [promptId]: Math.max(0, (prev[promptId] || 0) + change) }));
        getAllShowcaseImages().then(setAllShowcaseImages);
    }, []);

    const handleRemixSuccess = () => { setPromptToRemix(null); fetchData(); };
    // FIX: Add missing handlers for modals.
    const handleShowcaseSubmit = async (imageUrl: string) => {
        if (!promptForShowcase || !currentUser || !currentUserProfile) return;
        await addShowcaseImage({ promptId: promptForShowcase.id, userId: currentUser.uid, username: currentUserProfile.username, userPhotoURL: currentUserProfile.photoURL, imageUrl });
        updateShowcaseCount(promptForShowcase.id, 1);
    };
    
    const handleCreateCollection = async (name: string) => setCollections(await createCollection(currentUser, name));
    const handleToggleInCollection = async (promptId: string, collectionId: string) => setCollections(await togglePromptInCollection(currentUser, promptId, collectionId));
    const handleEditPrompt = (prompt: Prompt) => { setSelectedPrompt(null); setEditingPrompt(prompt); };
    const handleDeletePrompt = (prompt: Prompt) => setDeletingPrompt(prompt);

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
            if (selectedPrompt?.id === deletingPrompt.id) setSelectedPrompt(null);
            setDeletingPrompt(null);
            await fetchData();
        } catch (error) { console.error("Failed to delete prompt:", error); } 
        finally { setIsActionLoading(false); }
    };

    const renderNavTabs = () => (
        <nav className="flex space-x-8" aria-label="Tabs">
            <button onClick={() => setActiveTab('prompts')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'prompts' ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"}`}>{t('authorPage.promptsTab')} ({formatCount(promptsCount)})</button>
            <button onClick={() => setActiveTab('showcase')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'showcase' ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 dark:hover:border-gray-600"}`}>{t('authorPage.showcaseTab')} ({formatCount(authorShowcaseImages.length)})</button>
        </nav>
    );

    if (isLoading) {
        return <div className="flex justify-center items-center p-8"><Spinner size="lg" /></div>;
    }

    if (!authorProfile) {
        return (
            <div className="text-center py-20">
                <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">{t('authorPage.notFound')}</h1>
                <Link to="/" className="mt-4 inline-block text-indigo-600 dark:text-indigo-400 hover:underline">{t('authorPage.goHome')}</Link>
            </div>
        );
    }
    
    const cardProps = {
        categories, ratings, favorites, averageRatings, commentCounts, showcaseCounts, isAdmin, currentUser,
        onRate: handleRatePrompt, onToggleFavorite: handleToggleFavorite, onFindSimilar: setSourcePromptForModal, onOpenDetail: setSelectedPrompt,
        onReport: setReportingPrompt, onRemix: (p: Prompt) => currentUser ? setPromptToRemix(p) : setIsLoginModalOpen(true), onAddToCollection: (p: Prompt) => currentUser ? setPromptForCollections(p) : setIsLoginModalOpen(true),
        onUploadShowcase: (p: Prompt) => currentUser ? setPromptForShowcase(p) : setIsLoginModalOpen(true), onEdit: handleEditPrompt, onDelete: handleDeletePrompt
    };

    return (
        <>
            {/* Modals */}
            {isLoginModalOpen && <LoginSuggestionModal onClose={() => setIsLoginModalOpen(false)} />}
            {editingPrompt && <PromptForm initialData={editingPrompt} categories={categories} users={[]} onSubmit={handlePromptFormSubmit} onClose={() => setEditingPrompt(null)} isSubmitting={isActionLoading} isUserAdmin={isAdmin} isPro={isPro} />}
            {deletingPrompt && <ConfirmModal isOpen={!!deletingPrompt} onClose={() => setDeletingPrompt(null)} onConfirm={handleConfirmDelete} title={'Confirm Deletion'} message={'Are you sure you want to delete this prompt?'} confirmText={'Delete'} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            {selectedPrompt && <PromptDetailModal prompt={selectedPrompt} categories={categories} onClose={() => setSelectedPrompt(null)} userRating={ratings[selectedPrompt.id] || 0} onRate={handleRatePrompt} isFavorite={favorites.has(selectedPrompt.id)} onToggleFavorite={() => handleToggleFavorite(selectedPrompt)} averageRating={(averageRatings[selectedPrompt.id] || { average: 0 }).average} ratingCount={(averageRatings[selectedPrompt.id] || { count: 0 }).count} onFindSimilar={setSourcePromptForModal} onCommentUpdate={updateCommentCount} onShowcaseUpdate={updateShowcaseCount} onReport={setReportingPrompt} onRemix={cardProps.onRemix} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} canManage={isAdmin || (currentUser && selectedPrompt.authorId === currentUser.uid)} />}
            {sourcePromptForModal && <SimilarPromptsModal sourcePrompt={sourcePromptForModal} allPrompts={allPrompts} categories={categories} onClose={() => setSourcePromptForModal(null)} onFindSimilar={setSourcePromptForModal} ratings={ratings} averageRatings={averageRatings} onRatePrompt={handleRatePrompt} favorites={favorites} onToggleFavorite={handleToggleFavorite} commentCounts={commentCounts} onPromptClick={(p) => { setSelectedPrompt(p); setSourcePromptForModal(null); }} onReport={setReportingPrompt} onRemix={cardProps.onRemix} onAddToCollection={cardProps.onAddToCollection} showcaseCounts={showcaseCounts} onUploadShowcase={cardProps.onUploadShowcase} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} />}
            {reportingPrompt && <ReportModal prompt={reportingPrompt} onClose={() => setReportingPrompt(null)} />}
            {promptToRemix && currentUser && currentUserProfile && <RemixPromptModal promptToRemix={promptToRemix} onClose={() => setPromptToRemix(null)} onSubmitSuccess={handleRemixSuccess} categories={categories} currentUser={currentUser} userProfile={currentUserProfile} isPro={isPro} />}
            {promptForCollections && <AddToCollectionModal prompt={promptForCollections} userCollections={collections} onClose={() => setPromptForCollections(null)} onCreate={handleCreateCollection} onToggle={handleToggleInCollection} />}
            {promptForShowcase && <ShowcaseUploadModal prompt={promptForShowcase} onClose={() => setPromptForShowcase(null)} onSubmit={handleShowcaseSubmit} />}
            {galleryState.open && <PhotoGalleryModal images={authorShowcaseImages} startIndex={galleryState.index} onClose={() => setGalleryState({ open: false, index: 0 })} />}

            {/* Off-canvas menu for mobile */}
            <div className={`relative z-50 lg:hidden ${!isSidebarOpen && 'pointer-events-none'}`} role="dialog" aria-modal="true">
                <div 
                    className={`fixed inset-0 bg-black/60 transition-opacity duration-300 ease-in-out ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`} 
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
                <div className="fixed inset-0 flex">
                    <div 
                        className={`relative flex w-full max-w-xs flex-1 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                    >
                        <div className="flex h-full flex-col overflow-y-auto bg-white dark:bg-gray-800 p-6 shadow-xl">
                            <ProfileSidebar userProfile={authorProfile} onClose={() => setIsSidebarOpen(false)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                <ProfileHeader 
                    userProfile={authorProfile}
                    promptsCount={promptsCount}
                    isCurrentUser={currentUser?.uid === authorId}
                    isFollowing={isFollowing}
                    isFollowLoading={isFollowLoading}
                    onFollowToggle={handleFollowToggle}
                    onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                />
                
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 lg:gap-8">
                    <div className="hidden lg:block lg:col-span-4">
                        <ProfileSidebar userProfile={authorProfile} />
                    </div>

                    <div className="lg:col-span-8">
                        <div className="border-b border-gray-200 dark:border-gray-700">
                            <div className="hidden lg:block">{renderNavTabs()}</div>
                        </div>
                        <div className="mt-6">
                            {/* FIX: Add missing 'username' prop to UserPrompts component. */}
                            {activeTab === 'prompts' && <UserPrompts prompts={authorPrompts} cardProps={cardProps} isOwner={false} username={authorProfile.username} />}
                            {activeTab === 'showcase' && <UserShowcase images={authorShowcaseImages} setGalleryState={setGalleryState} isOwner={false} username={authorProfile.username} onDelete={() => {}}/>}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
