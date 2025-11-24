import React from 'react';
import { Prompt, Post, Reel, Category, Report, UserProfile, ShowcaseImage, ReelCategory, PostCategory, CategoryWithCount } from '../../utils/types';
import ConfirmModal from '../ConfirmModal';
import { PromptForm } from '../PromptForm';
import { ReelForm } from '../ReelForm';
import UserForm from '../UserForm';
import { useLanguage } from '../../context/LanguageContext';

interface AdminModalsProps {
    isPro: boolean;
    isActionLoading: boolean;
    prompts: Prompt[];
    // FIX: Update 'categories' prop to 'CategoryWithCount[]' to match PromptForm's expected type.
    categories: CategoryWithCount[];
    users: UserProfile[];
    reelCategories: ReelCategory[];
    isPromptFormOpen: boolean;
    setIsPromptFormOpen: (val: boolean) => void;
    editingPrompt: Prompt | null;
    deletingPrompt: Prompt | null;
    setDeletingPrompt: (val: Prompt | null) => void;
    deletingPost: Post | null;
    setDeletingPost: (val: Post | null) => void;
    isReelFormOpen: boolean;
    setIsReelFormOpen: (val: boolean) => void;
    editingReel: Reel | null;
    deletingReel: Reel | null;
    setDeletingReel: (val: Reel | null) => void;
    deletingShowcaseImage: ShowcaseImage | null;
    setDeletingShowcaseImage: (val: ShowcaseImage | null) => void;
    deletingReport: Report | null;
    setDeletingReport: (val: Report | null) => void;
    isUserFormOpen: boolean;
    setIsUserFormOpen: (val: boolean) => void;
    editingUser: UserProfile | null;
    setEditingUser: (val: UserProfile | null) => void;
    deletingUser: UserProfile | null;
    setDeletingUser: (val: UserProfile | null) => void;
    userFormError: string;
    setUserFormError: (val: string) => void;
    deletingCategory: Category | null;
    setDeletingCategory: (val: Category | null) => void;
    deletingPostCategory: PostCategory | null;
    setDeletingPostCategory: (val: PostCategory | null) => void;
    deletingReelCategory: ReelCategory | null;
    setDeletingReelCategory: (val: ReelCategory | null) => void;
    
    handlePromptFormSubmit: (formData: Prompt | Omit<Prompt, 'id' | 'createdAt'>) => Promise<void>;
    handleConfirmDeletePrompt: () => Promise<void>;
    handleConfirmDeletePost: () => Promise<void>;
    handleReelFormSubmit: (formData: Reel | Omit<Reel, 'id' | 'createdAt' | 'likeCount' | 'viewCount'>) => Promise<void>;
    handleConfirmDeleteReel: () => Promise<void>;
    handleConfirmDeleteShowcaseImage: () => Promise<void>;
    handleConfirmDeleteReport: () => Promise<void>;
    handleUserFormSubmit: (formData: UserProfile | Omit<UserProfile, 'uid'>) => Promise<void>;
    handleConfirmDeleteUser: () => Promise<void>;
    handleConfirmDeleteCategory: () => Promise<void>;
    handleConfirmDeletePostCategory: () => Promise<void>;
    handleConfirmDeleteReelCategory: () => Promise<void>;
}

const AdminModals: React.FC<AdminModalsProps> = ({
    isPro, isActionLoading, prompts, categories, users, reelCategories,
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
    handlePromptFormSubmit, handleConfirmDeletePrompt,
    handleConfirmDeletePost,
    handleReelFormSubmit, handleConfirmDeleteReel,
    handleConfirmDeleteShowcaseImage,
    handleConfirmDeleteReport,
    handleUserFormSubmit, handleConfirmDeleteUser,
    handleConfirmDeleteCategory,
    handleConfirmDeletePostCategory,
    handleConfirmDeleteReelCategory
}) => {
    const { t } = useLanguage();

    return (
        <>
            {isPromptFormOpen && <PromptForm initialData={editingPrompt} categories={categories} users={users} onSubmit={handlePromptFormSubmit} onClose={() => setIsPromptFormOpen(false)} isSubmitting={isActionLoading} isUserAdmin={true} isPro={isPro} />}
            {deletingPrompt && <ConfirmModal isOpen={!!deletingPrompt} onClose={() => setDeletingPrompt(null)} onConfirm={handleConfirmDeletePrompt} title={t('modals.confirmDeleteTitle')} message={t('admin.prompts.deletePromptConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            {deletingPost && <ConfirmModal isOpen={!!deletingPost} onClose={() => setDeletingPost(null)} onConfirm={handleConfirmDeletePost} title={t('modals.confirmDeleteTitle')} message={t('admin.posts.deleteConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            {isReelFormOpen && <ReelForm initialData={editingReel} onSubmit={handleReelFormSubmit} onClose={() => setIsReelFormOpen(false)} isSubmitting={isActionLoading} prompts={prompts} categories={reelCategories} />}
            {deletingReel && <ConfirmModal isOpen={!!deletingReel} onClose={() => setDeletingReel(null)} onConfirm={handleConfirmDeleteReel} title={t('modals.confirmDeleteTitle')} message={t('admin.reels.deleteConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            {deletingShowcaseImage && <ConfirmModal isOpen={!!deletingShowcaseImage} onClose={() => setDeletingShowcaseImage(null)} onConfirm={handleConfirmDeleteShowcaseImage} title={t('admin.showcase.title')} message={t('admin.showcase.deleteConfirm', { username: deletingShowcaseImage.username })} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            {deletingReport && <ConfirmModal isOpen={!!deletingReport} onClose={() => setDeletingReport(null)} onConfirm={handleConfirmDeleteReport} title="Delete Report" message="Are you sure you want to delete this report?" confirmText="Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            {isUserFormOpen && <UserForm 
                initialData={editingUser} 
                onSubmit={handleUserFormSubmit} 
                onClose={() => { setIsUserFormOpen(false); setEditingUser(null); setUserFormError(''); }} 
                isSubmitting={isActionLoading} 
                error={userFormError}
                clearError={() => setUserFormError('')}
            />}
            {deletingUser && <ConfirmModal isOpen={!!deletingUser} onClose={() => setDeletingUser(null)} onConfirm={handleConfirmDeleteUser} title="Delete User" message={`Are you sure you want to delete user ${deletingUser.username}? This cannot be undone.`} confirmText="Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            {deletingCategory && <ConfirmModal isOpen={!!deletingCategory} onClose={() => setDeletingCategory(null)} onConfirm={handleConfirmDeleteCategory} title="Delete Category" message={`Are you sure you want to delete category "${deletingCategory.name}"? Prompts will be unassigned.`} confirmText="Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            {deletingPostCategory && <ConfirmModal isOpen={!!deletingPostCategory} onClose={() => setDeletingPostCategory(null)} onConfirm={handleConfirmDeletePostCategory} title="Delete Post Category" message={`Are you sure you want to delete category "${deletingPostCategory.name}"? Posts will be unassigned.`} confirmText="Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            {deletingReelCategory && <ConfirmModal isOpen={!!deletingReelCategory} onClose={() => setDeletingReelCategory(null)} onConfirm={handleConfirmDeleteReelCategory} title="Delete Reel Category" message={`Are you sure you want to delete category "${deletingReelCategory.name}"? Reels will be unassigned.`} confirmText="Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
        </>
    );
};

export default AdminModals;