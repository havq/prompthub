import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    addPrompt as apiAddPrompt,
    updatePrompt as apiUpdatePrompt,
    deletePrompt as apiDeletePrompt,
    addPost as apiAddPost,
    updatePost as apiUpdatePost,
    deletePost as apiDeletePost,
    addReel as apiAddReel,
    updateReel as apiUpdateReel,
    deleteReel as apiDeleteReel,
    deleteReport as apiDeleteReport,
    addUser as apiAddUser,
    updateUserProfile as apiUpdateUserProfile,
    deleteUser as apiDeleteUser,
    deleteCategory as apiDeleteCategory,
    deletePostCategory as apiDeletePostCategory,
    deleteReelCategory as apiDeleteReelCategory,
    deleteShowcaseImage as apiDeleteShowcaseImage
} from '../services/api';
import { Prompt, Post, Category, Report, UserProfile, Reel, ShowcaseImage, ReelCategory, PostCategory } from '../utils/types';
import { useAdminContext } from '../context/AdminContext';
import { useAuth } from '../context/AuthContext';

export const useAdminActions = () => {
    const { prompts, posts, reels, categories, postCategories, reelCategories, reports, users, refreshData } = useAdminContext();
    const { isPro, userProfile } = useAuth();
    const navigate = useNavigate();

    const [isActionLoading, setIsActionLoading] = useState(false);

    // Modal States
    const [isPromptFormOpen, setIsPromptFormOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
    const [deletingPrompt, setDeletingPrompt] = useState<Prompt | null>(null);

    const [deletingPost, setDeletingPost] = useState<Post | null>(null);

    const [isReelFormOpen, setIsReelFormOpen] = useState(false);
    const [editingReel, setEditingReel] = useState<Reel | null>(null);
    const [deletingReel, setDeletingReel] = useState<Reel | null>(null);
    
    const [deletingShowcaseImage, setDeletingShowcaseImage] = useState<ShowcaseImage | null>(null);

    const [deletingReport, setDeletingReport] = useState<Report | null>(null);

    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
    const [userFormError, setUserFormError] = useState('');

    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
    const [deletingPostCategory, setDeletingPostCategory] = useState<PostCategory | null>(null);
    const [deletingReelCategory, setDeletingReelCategory] = useState<ReelCategory | null>(null);

    // Prompt handlers
    const handleAddPrompt = () => { setEditingPrompt(null); setIsPromptFormOpen(true); };
    const handleEditPrompt = (prompt: Prompt) => { setEditingPrompt(prompt); setIsPromptFormOpen(true); };
    const handleDeletePrompt = (id: string) => { setDeletingPrompt(prompts.find(p => p.id === id) || null); };
    const handleConfirmDeletePrompt = async () => {
        if (!deletingPrompt) return;
        setIsActionLoading(true);
        try {
            await apiDeletePrompt(deletingPrompt.id);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingPrompt(null); }
    };
    const handlePromptFormSubmit = async (formData: Prompt | Omit<Prompt, 'id' | 'createdAt'>) => {
        setIsActionLoading(true);
        try {
            if ('id' in formData) await apiUpdatePrompt(formData);
            else await apiAddPrompt(formData);
            refreshData();
            setIsPromptFormOpen(false);
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); }
    };

    // Post handlers
    const handleAddPost = () => navigate('/submit-post');
    const handleEditPost = (post: Post) => navigate(`/edit-post/${post.id}`);
    const handleDeletePost = (id: string) => setDeletingPost(posts.find(p => p.id === id) || null);
    const handleConfirmDeletePost = async () => {
        if (!deletingPost) return;
        setIsActionLoading(true);
        try {
            await apiDeletePost(deletingPost.id);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingPost(null); }
    };

    // Reel handlers
    const handleAddReel = () => { setEditingReel(null); setIsReelFormOpen(true); };
    const handleEditReel = (reel: Reel) => { setEditingReel(reel); setIsReelFormOpen(true); };
    const handleDeleteReel = (id: string) => setDeletingReel(reels.find(r => r.id === id) || null);
    const handleConfirmDeleteReel = async () => {
        if (!deletingReel) return;
        setIsActionLoading(true);
        try {
            await apiDeleteReel(deletingReel.id);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingReel(null); }
    };
    const handleReelFormSubmit = async (formData: Reel | Omit<Reel, 'id' | 'createdAt' | 'likeCount' | 'viewCount'>) => {
        setIsActionLoading(true);
        try {
            if ('id' in formData) {
                await apiUpdateReel(formData);
            } else {
                if (!userProfile) throw new Error("User profile not found.");
                await apiAddReel({ ...formData, authorId: userProfile.uid, authorName: userProfile.username });
            }
            refreshData();
            setIsReelFormOpen(false);
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); }
    };

    // Showcase handlers
    const handleDeleteShowcaseImage = (image: ShowcaseImage) => setDeletingShowcaseImage(image);
    const handleConfirmDeleteShowcaseImage = async () => {
        if (!deletingShowcaseImage) return;
        setIsActionLoading(true);
        try {
            await apiDeleteShowcaseImage(deletingShowcaseImage.id, deletingShowcaseImage.userId);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingShowcaseImage(null); }
    };

    // Report handlers
    const handleGoToPrompt = (promptId: string) => {
        const prompt = prompts.find(p => String(p.id) === String(promptId));
        if (prompt) {
            setEditingPrompt(prompt);
            setIsPromptFormOpen(true);
        }
    };
    const handleDeleteReport = (id: string) => setDeletingReport(reports.find(r => r.id === id) || null);
    const handleConfirmDeleteReport = async () => {
        if (!deletingReport) return;
        setIsActionLoading(true);
        try {
            await apiDeleteReport(deletingReport.id);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingReport(null); }
    };

    // User handlers
    const handleAddUser = () => { setEditingUser(null); setUserFormError(''); setIsUserFormOpen(true); };
    const handleEditUser = (user: UserProfile) => { setEditingUser(user); setUserFormError(''); setIsUserFormOpen(true); };
    const handleDeleteUser = (user: UserProfile) => setDeletingUser(user);
    const handleConfirmDeleteUser = async () => {
        if (!deletingUser) return;
        setIsActionLoading(true);
        try {
            await apiDeleteUser(deletingUser.uid);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingUser(null); }
    };
    const handleUserFormSubmit = async (formData: UserProfile | Omit<UserProfile, 'uid'>) => {
        setIsActionLoading(true);
        setUserFormError('');
        try {
            // FIX: Use 'uid' instead of 'id' to correctly identify the user for updates.
            if ('uid' in formData) await apiUpdateUserProfile(formData.uid, formData);
            else await apiAddUser(formData);
            refreshData();
            setIsUserFormOpen(false);
            setEditingUser(null);
        } catch (error: any) {
            let msg = error.message || "An unexpected error occurred.";
            if (typeof msg === 'string' && msg.includes('Duplicate entry')) {
                msg = msg.includes("'email'") ? 'A user with this email already exists.' : 'This username is already taken.';
            }
            setUserFormError(msg);
        } finally { setIsActionLoading(false); }
    };

    // Category handlers
    const handleDeleteCategory = (id: string) => setDeletingCategory(categories.find(c => c.id === id) || null);
    const handleConfirmDeleteCategory = async () => {
        if (!deletingCategory) return;
        setIsActionLoading(true);
        try {
            await apiDeleteCategory(deletingCategory.id);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingCategory(null); }
    };
    const handleDeletePostCategory = (id: string) => setDeletingPostCategory(postCategories.find(c => c.id === id) || null);
    const handleConfirmDeletePostCategory = async () => {
        if (!deletingPostCategory) return;
        setIsActionLoading(true);
        try {
            await apiDeletePostCategory(deletingPostCategory.id);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingPostCategory(null); }
    };
    const handleDeleteReelCategory = (id: string) => setDeletingReelCategory(reelCategories.find(c => c.id === id) || null);
    const handleConfirmDeleteReelCategory = async () => {
        if (!deletingReelCategory) return;
        setIsActionLoading(true);
        try {
            await apiDeleteReelCategory(deletingReelCategory.id);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingReelCategory(null); }
    };

    return {
        isPro,
        isActionLoading,
        isPromptFormOpen, setIsPromptFormOpen, editingPrompt,
        deletingPrompt, setDeletingPrompt,
        deletingPost, setDeletingPost,
        isReelFormOpen, setIsReelFormOpen, editingReel,
        deletingReel, setDeletingReel,
        deletingShowcaseImage, setDeletingShowcaseImage,
        deletingReport, setDeletingReport,
        isUserFormOpen, setIsUserFormOpen, editingUser, setEditingUser,
        deletingUser, setDeletingUser, userFormError, setUserFormError,
        deletingCategory, setDeletingCategory,
        deletingPostCategory, setDeletingPostCategory,
        deletingReelCategory, setDeletingReelCategory,
        handleAddPrompt, handleEditPrompt, handleDeletePrompt, handleConfirmDeletePrompt, handlePromptFormSubmit,
        handleAddPost, handleEditPost, handleDeletePost, handleConfirmDeletePost,
        handleAddReel, handleEditReel, handleDeleteReel, handleConfirmDeleteReel, handleReelFormSubmit,
        handleDeleteShowcaseImage, handleConfirmDeleteShowcaseImage,
        handleGoToPrompt, handleDeleteReport, handleConfirmDeleteReport,
        handleAddUser, handleEditUser, handleDeleteUser, handleConfirmDeleteUser, handleUserFormSubmit,
        handleDeleteCategory, handleConfirmDeleteCategory,
        handleDeletePostCategory, handleConfirmDeletePostCategory,
        handleDeleteReelCategory, handleConfirmDeleteReelCategory,
    };
};