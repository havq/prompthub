import { useState, useCallback } from 'react';
import { Prompt, Collection } from '../utils/types';
import {
    saveRating,
    addShowcaseImage,
    updatePrompt,
    deletePrompt as apiDeletePrompt,
    createCollection,
    togglePromptInCollection,
    getAllShowcaseImages,
    getCombinedRatings,
    getRatings
} from '../services/api';
// FIX: Corrected imports for 'getFavorites' and 'toggleFavorite' from 'favoriteService'.
import { getFavorites, toggleFavorite } from '../services/favoriteService';
import { useAuth } from '../context/AuthContext';

export const useProfileInteractions = (
    allPrompts: Prompt[],
    initialFavorites: Set<string>,
    initialRatings: Record<string, number>,
    initialCollections: Collection[],
    fetchGalleryData: () => void
) => {
    const { currentUser, userProfile, isAdmin, isPro, refetchUserProfile } = useAuth();
    
    // Data state managed here for interactions
    const [favorites, setFavorites] = useState(initialFavorites);
    const [ratings, setRatings] = useState(initialRatings);
    const [collections, setCollections] = useState(initialCollections);
    const [averageRatings, setAverageRatings] = useState<Record<string, { average: number; count: number }>>({});
    const [showcaseCounts, setShowcaseCounts] = useState<Record<string, number>>({});
    const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
    const [allShowcaseImages, setAllShowcaseImages] = useState<any[]>([]);

    // Modal state
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const [sourcePromptForModal, setSourcePromptForModal] = useState<Prompt | null>(null);
    const [reportingPrompt, setReportingPrompt] = useState<Prompt | null>(null);
    const [promptToRemix, setPromptToRemix] = useState<Prompt | null>(null);
    const [promptForCollections, setPromptForCollections] = useState<Prompt | null>(null);
    const [promptForShowcase, setPromptForShowcase] = useState<Prompt | null>(null);
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
    const [deletingPrompt, setDeletingPrompt] = useState<Prompt | null>(null);
    const [deletingShowcaseImageId, setDeletingShowcaseImageId] = useState<string | null>(null);
    const [galleryState, setGalleryState] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const handleRatePrompt = async (prompt: Prompt, newRating: number) => {
        if (!currentUser || !userProfile) { setIsLoginModalOpen(true); return; }
        await saveRating(prompt, newRating, userProfile);
        const [updatedUserRatings, updatedAverageRatings] = await Promise.all([ getRatings(currentUser), getCombinedRatings(currentUser.uid).then(d => d.averageRatings) ]);
        setRatings(updatedUserRatings);
        setAverageRatings(updatedAverageRatings);
        fetchGalleryData(); // Refetch all to be safe
    };

    const handleToggleFavorite = async (prompt: Prompt) => {
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
        if (!promptForShowcase || !currentUser || !userProfile) return;
        await addShowcaseImage({ promptId: promptForShowcase.id, userId: currentUser.uid, username: userProfile.username, userPhotoURL: userProfile.photoURL, imageUrl });
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
    
    return {
        isLoginModalOpen, setIsLoginModalOpen,
        selectedPrompt, setSelectedPrompt,
        sourcePromptForModal, setSourcePromptForModal,
        reportingPrompt, setReportingPrompt,
        promptToRemix, setPromptToRemix,
        promptForCollections, setPromptForCollections,
        promptForShowcase, setPromptForShowcase,
        editingPrompt, setEditingPrompt,
        deletingPrompt, setDeletingPrompt,
        deletingShowcaseImageId, setDeletingShowcaseImageId,
        galleryState, setGalleryState,
        isActionLoading, setIsActionLoading,
        
        // Pass down interaction handlers
        handleRatePrompt,
        handleToggleFavorite,
        updateCommentCount,
        updateShowcaseCount,
        handleRemixSuccess,
        handleShowcaseSubmit,
        handleCreateCollection,
        handleToggleInCollection,
        handleEditPrompt,
        handleDeletePrompt,
        handlePromptFormSubmit,
        handleConfirmDelete
    };
};
