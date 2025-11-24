
import React from 'react';
import { Prompt, Collection, UserProfile, CategoryWithCount } from '../../utils/types';
import { useLanguage } from '../../context/LanguageContext';
import AIPromptGeneratorModal from '../AIPromptGeneratorModal';
import LoginSuggestionModal from '../LoginSuggestionModal';
import RemixPromptModal from '../RemixPromptModal';
import AddToCollectionModal from '../AddToCollectionModal';
import ShowcaseUploadModal from '../ShowcaseUploadModal';
import ReportModal from '../ReportModal';
import ConfirmModal from '../ConfirmModal';
import { PromptForm } from '../PromptForm';
import SimilarPromptsModal from '../SimilarPromptsModal';
import { PromptDetailModal } from '../PromptDetailModal';

interface HomeModalsProps {
    isAIGeneratorOpen: boolean;
    setIsAIGeneratorOpen: (val: boolean) => void;
    isLoginModalOpen: boolean;
    setIsLoginModalOpen: (val: boolean) => void;
    promptToRemix: Prompt | null;
    setPromptToRemix: (val: Prompt | null) => void;
    handleRemixSuccess: () => void;
    categories: CategoryWithCount[];
    currentUser: any;
    userProfile: UserProfile | null;
    isPro: boolean;
    promptForCollections: Prompt | null;
    setPromptForCollections: (val: Prompt | null) => void;
    collections: Collection[];
    handleCreateCollection: (name: string) => Promise<void>;
    handleToggleInCollection: (promptId: string, collectionId: string) => Promise<void>;
    promptForShowcase: Prompt | null;
    setPromptForShowcase: (val: Prompt | null) => void;
    handleShowcaseSubmit: (imageUrl: string) => Promise<void>;
    reportingPrompt: Prompt | null;
    setReportingPrompt: (val: Prompt | null) => void;
    editingPrompt: Prompt | null;
    setEditingPrompt: (val: Prompt | null) => void;
    users: UserProfile[];
    handlePromptFormSubmit: (data: any) => Promise<void>;
    isActionLoading: boolean;
    isAdmin: boolean;
    deletingPrompt: Prompt | null;
    setDeletingPrompt: (val: Prompt | null) => void;
    handleConfirmDelete: () => Promise<void>;
    t: (key: string) => string;
    sourcePromptForModal: Prompt | null;
    setSourcePromptForModal: (val: Prompt | null) => void;
    searchablePrompts: Prompt[];
    handleFindSimilar: (prompt: Prompt) => void;
    ratings: Record<string, number>;
    averageRatings: Record<string, { average: number; count: number }>;
    handleRatePrompt: (prompt: Prompt, rating: number, setModalOpen: (val: boolean) => void) => Promise<void>;
    favorites: Set<string>;
    handleToggleFavorite: (prompt: Prompt) => Promise<void>;
    commentCounts: Record<string, number>;
    handlePromptClickFromSimilar: (prompt: Prompt) => void;
    handleOpenReportModal: (prompt: Prompt) => void;
    handleRemixPrompt: (prompt: Prompt) => void;
    handleAddToCollection: (prompt: Prompt) => void;
    showcaseCounts: Record<string, number>;
    handleOpenShowcaseUpload: (prompt: Prompt) => void;
    handleEditPrompt: (prompt: Prompt) => void;
    handleDeletePrompt: (prompt: Prompt) => void;
    selectedPrompt: Prompt | null;
    handleClosePromptDetail: () => void;
    updateCommentCount: (id: string, change: number) => void;
    updateShowcaseCount: (id: string, change: number) => void;
}

const HomeModals: React.FC<HomeModalsProps> = ({
    isAIGeneratorOpen, setIsAIGeneratorOpen, isLoginModalOpen, setIsLoginModalOpen,
    promptToRemix, setPromptToRemix, handleRemixSuccess, categories, currentUser, userProfile, isPro,
    promptForCollections, setPromptForCollections, collections, handleCreateCollection, handleToggleInCollection,
    promptForShowcase, setPromptForShowcase, handleShowcaseSubmit, reportingPrompt, setReportingPrompt,
    editingPrompt, setEditingPrompt, users, handlePromptFormSubmit, isActionLoading, isAdmin,
    deletingPrompt, setDeletingPrompt, handleConfirmDelete, t, sourcePromptForModal, setSourcePromptForModal,
    searchablePrompts, handleFindSimilar, ratings, averageRatings, handleRatePrompt, favorites, handleToggleFavorite,
    commentCounts, handlePromptClickFromSimilar, handleOpenReportModal, handleRemixPrompt, handleAddToCollection,
    showcaseCounts, handleOpenShowcaseUpload, handleEditPrompt, handleDeletePrompt, selectedPrompt, handleClosePromptDetail,
    updateCommentCount, updateShowcaseCount
}) => {
    return (
        <>
            {isAIGeneratorOpen && <AIPromptGeneratorModal onClose={() => setIsAIGeneratorOpen(false)} />}
            {isLoginModalOpen && <LoginSuggestionModal onClose={() => setIsLoginModalOpen(false)} />}
            {promptToRemix && currentUser && userProfile && <RemixPromptModal promptToRemix={promptToRemix} onClose={() => setPromptToRemix(null)} onSubmitSuccess={handleRemixSuccess} categories={categories} currentUser={currentUser} userProfile={userProfile} isPro={!!isPro} />}
            {promptForCollections && <AddToCollectionModal prompt={promptForCollections} userCollections={collections} onClose={() => setPromptForCollections(null)} onCreate={handleCreateCollection} onToggle={handleToggleInCollection} />}
            {promptForShowcase && <ShowcaseUploadModal prompt={promptForShowcase} onClose={() => setPromptForShowcase(null)} onSubmit={handleShowcaseSubmit} />}
            {reportingPrompt && <ReportModal prompt={reportingPrompt} onClose={() => setReportingPrompt(null)} />}
            {editingPrompt && <PromptForm initialData={editingPrompt} categories={categories} users={users} onSubmit={handlePromptFormSubmit} onClose={() => setEditingPrompt(null)} isSubmitting={isActionLoading} isUserAdmin={isAdmin} isPro={!!isPro} />}
            {deletingPrompt && <ConfirmModal isOpen={!!deletingPrompt} onClose={() => setDeletingPrompt(null)} onConfirm={handleConfirmDelete} title={t('modals.confirmDeleteTitle')} message={t('admin.prompts.deletePromptConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            {sourcePromptForModal && <SimilarPromptsModal sourcePrompt={sourcePromptForModal} allPrompts={searchablePrompts} categories={categories} onClose={() => setSourcePromptForModal(null)} onFindSimilar={handleFindSimilar} ratings={ratings} averageRatings={averageRatings} onRatePrompt={(p, r) => handleRatePrompt(p, r, setIsLoginModalOpen)} favorites={favorites} onToggleFavorite={handleToggleFavorite} commentCounts={commentCounts} onPromptClick={handlePromptClickFromSimilar} onReport={handleOpenReportModal} onRemix={handleRemixPrompt} onAddToCollection={handleAddToCollection} showcaseCounts={showcaseCounts} onUploadShowcase={handleOpenShowcaseUpload} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} />}
            {selectedPrompt && <PromptDetailModal prompt={selectedPrompt} categories={categories} onClose={handleClosePromptDetail} userRating={ratings[selectedPrompt.id] || 0} onRate={(p, r) => handleRatePrompt(p, r, setIsLoginModalOpen)} isFavorite={favorites.has(selectedPrompt.id)} onToggleFavorite={() => handleToggleFavorite(selectedPrompt)} averageRating={(averageRatings[selectedPrompt.id] || { average: 0 }).average} ratingCount={(averageRatings[selectedPrompt.id] || { count: 0 }).count} onFindSimilar={handleFindSimilar} onCommentUpdate={updateCommentCount} onShowcaseUpdate={updateShowcaseCount} onReport={handleOpenReportModal} onRemix={handleRemixPrompt} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} canManage={isAdmin || (currentUser && selectedPrompt.authorId === currentUser.uid)} />}
        </>
    );
};

export default HomeModals;
