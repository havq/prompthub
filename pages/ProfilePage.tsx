
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// @ts-ignore
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Prompt, CategoryWithCount, Collection, ShowcaseImage, UserProfile } from '../types';
import {
    getUserProfile, getPrompts, getCategories, getAllComments, getCollections, getAllShowcaseImageCounts, addShowcaseImage,
    getAllShowcaseImages, updatePrompt, deletePrompt as apiDeletePrompt, deleteShowcaseImage as apiDeleteShowcaseImage,
    getRatings, getAllAverageRatings, saveRating, createCollection, togglePromptInCollection, followUser, unfollowUser,
    getAllUsers
} from '../services/api';
import Spinner from '../components/Spinner';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileSidebar from '../components/profile/ProfileSidebar';
import ProfileTabs from '../components/profile/ProfileTabs';
import EditProfileModal from '../components/profile/EditProfileModal';
import ChangePasswordModal from '../components/profile/ChangePasswordModal';
import CameraCaptureModal from '../components/CameraCaptureModal';
import NotificationSettingsModal from '../components/profile/NotificationSettingsModal';
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
import { useLanguage } from '../context/LanguageContext';
import { getFavorites, toggleFavorite } from '../services/favoriteService';
import LoginSuggestionModal from '../components/LoginSuggestionModal';

export const ProfilePage: React.FC = () => {
    const { authorId } = useParams() as { authorId?: string };
    const { userProfile: currentUserProfile, updateUserProfile, currentUser, changePassword, isAdmin, isPro, refetchUserProfile } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [profileToDisplay, setProfileToDisplay] = useState<UserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    // Logic to determine if we are viewing our own profile
    const isCurrentUserPage = !authorId || (currentUserProfile && authorId === currentUserProfile.uid);

    // Modal Visibility State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'prompts' | 'pending' | 'favorites' | 'collections' | 'showcase' | 'analytics' | 'settings' | 'private'>('prompts');

    // Data State
    const [allPrompts, setAllPrompts] = useState<Prompt[]>([]);
    const [categories, setCategories] = useState<CategoryWithCount[]>([]);
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [averageRatings, setAverageRatings] = useState<Record<string, { average: number; count: number }>>({});
    const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
    const [showcaseCounts, setShowcaseCounts] = useState<Record<string, number>>({});
    const [allShowcaseImages, setAllShowcaseImages] = useState<ShowcaseImage[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [isGalleryLoading, setIsGalleryLoading] = useState(true);

    // Follow State
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);

    // Interaction/Modal State
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const [sourcePromptForModal, setSourcePromptForModal] = useState<Prompt | null>(null);
    const [reportingPrompt, setReportingPrompt] = useState<Prompt | null>(null);
    const [promptToRemix, setPromptToRemix] = useState<Prompt | null>(null);
    const [promptForCollections, setPromptForCollections] = useState<Prompt | null>(null);
    const [promptForShowcase, setPromptForShowcase] = useState<Prompt | null>(null);
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
    const [deletingPrompt, setDeletingPrompt] = useState<Prompt | null>(null);
    const [deletingShowcaseImageId, setDeletingShowcaseImageId] = useState<string | null>(null);
    const [galleryState, setGalleryState] = useState<{ open: boolean, index: number }>({ open: false, index: 0 });
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const prevUserRef = useRef(currentUser);
    useEffect(() => {
        prevUserRef.current = currentUser;
    });

    const fetchProfileData = useCallback(async () => {
        setIsLoadingProfile(true);
        try {
            let profile: UserProfile | null = null;
            
            if (isCurrentUserPage) {
                if (currentUserProfile) {
                    profile = currentUserProfile;
                } else if (currentUser) {
                    // Fallback if context hasn't loaded profile yet but user is auth'd
                    profile = await getUserProfile(currentUser.uid);
                }
            } else if (authorId) {
                profile = await getUserProfile(authorId);
            }

            if (profile) {
                setProfileToDisplay(profile);
                if (!isCurrentUserPage && currentUserProfile) {
                    setIsFollowing(!!currentUserProfile.following?.[profile.uid]);
                }
            } else if (isCurrentUserPage && !currentUser) {
                 // Not logged in and trying to view own profile -> redirect
                 navigate('/login');
                 return;
            }
        } catch (error) {
            console.error("Failed to fetch user profile:", error);
        } finally {
            setIsLoadingProfile(false);
        }
    }, [authorId, currentUser, currentUserProfile, isCurrentUserPage, navigate]);

    const fetchGalleryData = useCallback(async () => {
        setIsGalleryLoading(true);
        try {
            const [categoryData, favoritesData, ratingsData, avgRatingsData, allCommentsData, collectionsData, showcaseData, allShowcaseImagesData] = await Promise.all([
                getCategories(),
                getFavorites(currentUser),
                getRatings(currentUser),
                getAllAverageRatings(),
                getAllComments(),
                getCollections(currentUser),
                getAllShowcaseImageCounts(),
                getAllShowcaseImages(),
            ]);

            // 1. Fetch global approved prompts (needed for favorites, collections, etc. that might be from other users)
            const globalPromptsPromise = getPrompts({ page: 1, limit: 10000, sortBy: 'newest' });
            
            // 2. Fetch user specific prompts if viewing own profile (this request includes pending and private prompts)
            let userPromptsPromise = Promise.resolve({ prompts: [] as Prompt[], total: 0 });
            if (isCurrentUserPage && currentUser) {
                 userPromptsPromise = getPrompts({ page: 1, limit: 10000, sortBy: 'newest', author: currentUser.uid });
            }

            const [globalResponse, userResponse] = await Promise.all([globalPromptsPromise, userPromptsPromise]);

            // Merge prompts: User specific prompts should override global ones to ensure we have the correct status (pending/private)
            const promptMap = new Map<string, Prompt>();
            
            // Populate with global prompts
            globalResponse.prompts.forEach(p => promptMap.set(p.id, p));
            
            // Add/Overwrite with user specific prompts
            if (userResponse.prompts.length > 0) {
                userResponse.prompts.forEach(p => promptMap.set(p.id, p));
            }

            const mergedPrompts = Array.from(promptMap.values());

            setAllPrompts(mergedPrompts);
            setCategories(categoryData);
            setFavorites(favoritesData);
            setRatings(ratingsData);
            setAverageRatings(avgRatingsData);
            setCollections(collectionsData);
            setShowcaseCounts(showcaseData);
            setAllShowcaseImages(allShowcaseImagesData);

            const counts: Record<string, number> = {};
            allCommentsData.forEach(comment => {
                counts[comment.promptId] = (counts[comment.promptId] || 0) + 1;
            });
            setCommentCounts(counts);

        } catch (error) {
            console.error("Failed to fetch gallery data:", error);
        } finally {
            setIsGalleryLoading(false);
        }
    }, [currentUser, isCurrentUserPage]);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    useEffect(() => {
        if (profileToDisplay) {
            fetchGalleryData();
        }
    }, [profileToDisplay, fetchGalleryData]);

    // --- Handlers ---

    const handleFollowToggle = async () => {
        if (!currentUser || !profileToDisplay) { setIsLoginModalOpen(true); return; }
        if (isCurrentUserPage || isFollowLoading) return;

        setIsFollowLoading(true);
        const originalFollowingState = isFollowing;
        
        // Optimistic update
        setIsFollowing(!originalFollowingState);
        setProfileToDisplay(prev => prev ? ({...prev, followerCount: Math.max(0, (prev.followerCount || 0) + (originalFollowingState ? -1 : 1))}) : null);

        try {
            if (originalFollowingState) {
                await unfollowUser(currentUser.uid, profileToDisplay.uid);
            } else {
                await followUser(currentUser.uid, profileToDisplay.uid);
            }
            // Refresh current user profile to update 'following' list in context
            await refetchUserProfile();
        } catch (error) {
            console.error("Failed to toggle follow state:", error);
            // Revert
            setIsFollowing(originalFollowingState);
            setProfileToDisplay(prev => prev ? ({...prev, followerCount: Math.max(0, (prev.followerCount || 0) + (originalFollowingState ? 1 : -1))}) : null);
        } finally {
            setIsFollowLoading(false);
        }
    };

    const handleRatePrompt = async (prompt: Prompt, newRating: number) => {
        if (!currentUser || !currentUserProfile) { setIsLoginModalOpen(true); return; }
        await saveRating(prompt, newRating, currentUserProfile);
        const [updatedUserRatings, updatedAverageRatings] = await Promise.all([ getRatings(currentUser), getAllAverageRatings() ]);
        setRatings(updatedUserRatings);
        setAverageRatings(updatedAverageRatings);
    };

    const handleToggleFavorite = async (prompt: Prompt) => {
        // FIX: Pass current favorites state to avoid re-fetching from server
        const newFavorites = await toggleFavorite(prompt.id, currentUser, prompt.authorId, favorites);
        setFavorites(newFavorites);
    };

    const updateCommentCount = useCallback((promptId: string, change: 1 | -1) => setCommentCounts(prev => ({ ...prev, [promptId]: (prev[promptId] || 0) + change })), []);
    const updateShowcaseCount = useCallback((promptId: string, change: 1 | -1) => {
        setShowcaseCounts(prev => ({ ...prev, [promptId]: Math.max(0, (prev[promptId] || 0) + change) }));
        getAllShowcaseImages().then(setAllShowcaseImages);
    }, []);

    const handleRemixSuccess = () => { setPromptToRemix(null); fetchGalleryData(); };
    
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
        try { if ('id' in formData) await updatePrompt(formData); await fetchGalleryData(); setEditingPrompt(null); } 
        catch (error) { console.error("Failed to submit prompt:", error); } finally { setIsActionLoading(false); }
    };
    
    const handleConfirmDelete = async () => {
        if (!deletingPrompt) return;
        setIsActionLoading(true);
        try {
            await apiDeletePrompt(deletingPrompt.id);
            if (selectedPrompt?.id === deletingPrompt.id) setSelectedPrompt(null);
            setDeletingPrompt(null);
            await fetchGalleryData();
        } catch (error) { console.error("Failed to delete prompt:", error); } 
        finally { setIsActionLoading(false); }
    };

    const handleDeleteShowcaseImage = async () => {
        if (!deletingShowcaseImageId || !currentUser) return;
        setIsActionLoading(true);
        try {
            await apiDeleteShowcaseImage(deletingShowcaseImageId, currentUser.uid);
            setDeletingShowcaseImageId(null);
            await fetchGalleryData();
        } catch (error) { console.error("Failed to delete showcase image:", error); }
        finally { setIsActionLoading(false); }
    };

    const handleCaptureProfilePhoto = async (file: File) => {
        setIsActionLoading(true);
        try {
            const result = await uploadImage(file, undefined, { isPro, isAdmin });
            await updateUserProfile({ photoURL: result.imageUrl });
            setIsCameraModalOpen(false);
            if (profileToDisplay) setProfileToDisplay({ ...profileToDisplay, photoURL: result.imageUrl });
        } catch (error) { console.error("Failed to upload captured photo:", error); }
        finally { setIsActionLoading(false); }
    };

    if (isLoadingProfile || !profileToDisplay) {
        return <div className="flex justify-center items-center p-8 h-[50vh]"><Spinner size="lg" /></div>;
    }

    const promptsCount = allPrompts.filter(p => p.authorId === profileToDisplay.uid && (!p.isPrivate || isCurrentUserPage)).length;

    const cardProps = {
        categories, ratings, favorites, averageRatings, commentCounts, showcaseCounts, isAdmin, currentUser,
        onRate: handleRatePrompt, onToggleFavorite: handleToggleFavorite, onFindSimilar: setSourcePromptForModal, onOpenDetail: setSelectedPrompt,
        onReport: setReportingPrompt, onRemix: (p: Prompt) => currentUser ? setPromptToRemix(p) : setIsLoginModalOpen(true), onAddToCollection: (p: Prompt) => currentUser ? setPromptForCollections(p) : setIsLoginModalOpen(true),
        onUploadShowcase: (p: Prompt) => currentUser ? setPromptForShowcase(p) : setIsLoginModalOpen(true), onEdit: handleEditPrompt, onDelete: handleDeletePrompt,
        onCommentUpdate: updateCommentCount, onShowcaseUpdate: updateShowcaseCount
    };

    return (
        <>
            {/* Modals */}
            {isEditModalOpen && <EditProfileModal onClose={() => setIsEditModalOpen(false)} onCameraOpen={() => { setIsEditModalOpen(false); setIsCameraModalOpen(true); }} />}
            {isPasswordModalOpen && <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />}
            {isCameraModalOpen && <CameraCaptureModal onClose={() => setIsCameraModalOpen(false)} onCapture={handleCaptureProfilePhoto} />}
            {isSettingsModalOpen && <NotificationSettingsModal initialSettings={profileToDisplay.notificationSettings} onSave={async (s) => { await updateUserProfile({ notificationSettings: s }); setIsSettingsModalOpen(false); }} onClose={() => setIsSettingsModalOpen(false)} />}
            
            {isLoginModalOpen && <LoginSuggestionModal onClose={() => setIsLoginModalOpen(false)} />}
            {editingPrompt && <PromptForm initialData={editingPrompt} categories={categories} users={[]} onSubmit={handlePromptFormSubmit} onClose={() => setEditingPrompt(null)} isSubmitting={isActionLoading} isUserAdmin={isAdmin} isPro={isPro} />}
            {deletingPrompt && <ConfirmModal isOpen={!!deletingPrompt} onClose={() => setDeletingPrompt(null)} onConfirm={handleConfirmDelete} title={'Confirm Deletion'} message={'Are you sure you want to delete this prompt?'} confirmText={'Delete'} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            {deletingShowcaseImageId && <ConfirmModal isOpen={!!deletingShowcaseImageId} onClose={() => setDeletingShowcaseImageId(null)} onConfirm={handleDeleteShowcaseImage} title={t('common.delete')} message={t('profile.deleteShowcaseConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            
            {selectedPrompt && <PromptDetailModal prompt={selectedPrompt} categories={categories} onClose={() => setSelectedPrompt(null)} userRating={ratings[selectedPrompt.id] || 0} onRate={handleRatePrompt} isFavorite={favorites.has(selectedPrompt.id)} onToggleFavorite={() => handleToggleFavorite(selectedPrompt)} averageRating={(averageRatings[selectedPrompt.id] || { average: 0 }).average} ratingCount={(averageRatings[selectedPrompt.id] || { count: 0 }).count} onFindSimilar={setSourcePromptForModal} onCommentUpdate={updateCommentCount} onShowcaseUpdate={updateShowcaseCount} onReport={setReportingPrompt} onRemix={cardProps.onRemix} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} canManage={isAdmin || (currentUser && selectedPrompt.authorId === currentUser.uid)} />}
            {sourcePromptForModal && <SimilarPromptsModal sourcePrompt={sourcePromptForModal} allPrompts={allPrompts} categories={categories} onClose={() => setSourcePromptForModal(null)} onFindSimilar={setSourcePromptForModal} ratings={ratings} averageRatings={averageRatings} onRatePrompt={handleRatePrompt} favorites={favorites} onToggleFavorite={handleToggleFavorite} commentCounts={commentCounts} onPromptClick={(p) => { setSelectedPrompt(p); setSourcePromptForModal(null); }} onReport={setReportingPrompt} onRemix={cardProps.onRemix} onAddToCollection={cardProps.onAddToCollection} showcaseCounts={showcaseCounts} onUploadShowcase={cardProps.onUploadShowcase} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} />}
            {reportingPrompt && <ReportModal prompt={reportingPrompt} onClose={() => setReportingPrompt(null)} />}
            {promptToRemix && currentUser && currentUserProfile && <RemixPromptModal promptToRemix={promptToRemix} onClose={() => setPromptToRemix(null)} onSubmitSuccess={handleRemixSuccess} categories={categories} currentUser={currentUser} userProfile={currentUserProfile} isPro={isPro} />}
            {promptForCollections && <AddToCollectionModal prompt={promptForCollections} userCollections={collections} onClose={() => setPromptForCollections(null)} onCreate={handleCreateCollection} onToggle={handleToggleInCollection} />}
            {promptForShowcase && <ShowcaseUploadModal prompt={promptForShowcase} onClose={() => setPromptForShowcase(null)} onSubmit={handleShowcaseSubmit} />}
            {galleryState.open && <PhotoGalleryModal images={allShowcaseImages.filter(img => img.userId === profileToDisplay.uid)} startIndex={galleryState.index} onClose={() => setGalleryState({ open: false, index: 0 })} />}

            {/* Mobile Sidebar Overlay */}
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
                            <ProfileSidebar userProfile={profileToDisplay} onClose={() => setIsSidebarOpen(false)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                <ProfileHeader 
                    userProfile={profileToDisplay}
                    promptsCount={promptsCount}
                    isCurrentUser={isCurrentUserPage}
                    isFollowing={isFollowing}
                    isFollowLoading={isFollowLoading}
                    onFollowToggle={handleFollowToggle}
                    onEdit={() => setIsEditModalOpen(true)}
                    onChangePassword={() => setIsPasswordModalOpen(true)}
                    onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                    onSettingsClick={() => setIsSettingsModalOpen(true)}
                />
                
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 lg:gap-8">
                    <div className="hidden lg:block lg:col-span-4">
                        <ProfileSidebar userProfile={profileToDisplay} />
                    </div>

                    <div className="lg:col-span-8">
                        <ProfileTabs 
                            userProfile={profileToDisplay}
                            isCurrentUserPage={isCurrentUserPage}
                            isGalleryLoading={isGalleryLoading}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            allPrompts={allPrompts}
                            isPro={!!isPro}
                            allShowcaseImages={allShowcaseImages}
                            setGalleryState={setGalleryState}
                            setDeletingShowcaseImageId={setDeletingShowcaseImageId}
                            collections={collections}
                            setCollections={setCollections}
                            cardProps={cardProps}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};
