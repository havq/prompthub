import React from 'react';
import { Prompt, CategoryWithCount, Collection, ShowcaseImage, UserProfile } from '../../utils/types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { PromptDetailModal } from '../PromptDetailModal';
import SimilarPromptsModal from '../SimilarPromptsModal';
import ReportModal from '../ReportModal';
import RemixPromptModal from '../RemixPromptModal';
import AddToCollectionModal from '../AddToCollectionModal';
import ShowcaseUploadModal from '../ShowcaseUploadModal';
import ConfirmModal from '../ConfirmModal';
import PhotoGalleryModal from '../PhotoGalleryModal';
import { PromptForm } from '../PromptForm';
import { useProfileInteractions } from '../../hooks/useProfileInteractions';

interface ProfileModalsProps {
    interactions: ReturnType<typeof useProfileInteractions>;
    allPrompts: Prompt[];
    allShowcaseImages: ShowcaseImage[];
    categories: CategoryWithCount[];
    collections: Collection[];
    averageRatings: Record<string, { average: number; count: number }>;
    commentCounts: Record<string, number>;
    showcaseCounts: Record<string, number>;
    ratings: Record<string, number>;
    favorites: Set<string>;
    profileToDisplay: UserProfile;
}

const ProfileModals: React.FC<ProfileModalsProps> = ({
    interactions, allPrompts, allShowcaseImages, categories, collections,
    averageRatings, commentCounts, showcaseCounts, ratings, favorites, profileToDisplay
}) => {
    const { t } = useLanguage();
    const { currentUser, userProfile, isAdmin, isPro } = useAuth();
    
    const {
        selectedPrompt, setSelectedPrompt,
        sourcePromptForModal, setSourcePromptForModal,
        reportingPrompt, setReportingPrompt,
        promptToRemix, setPromptToRemix,
        promptForCollections, setPromptForCollections,
        promptForShowcase, setPromptForShowcase,
        editingPrompt, setEditingPrompt,
        deletingPrompt, setDeletingPrompt,
        isActionLoading,
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
    } = interactions;

    const handleAuthAction = (action: () => void) => {
        if (currentUser) action();
        else interactions.setIsLoginModalOpen(true);
    };

    return (
        <>
            {editingPrompt && <PromptForm initialData={editingPrompt} categories={categories} users={[]} onSubmit={handlePromptFormSubmit} onClose={() => setEditingPrompt(null)} isSubmitting={isActionLoading} isUserAdmin={isAdmin} isPro={!!isPro} />}
            {deletingPrompt && <ConfirmModal isOpen={!!deletingPrompt} onClose={() => setDeletingPrompt(null)} onConfirm={handleConfirmDelete} title={'Confirm Deletion'} message={'Are you sure you want to delete this prompt?'} confirmText={'Delete'} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            
            {selectedPrompt && <PromptDetailModal prompt={selectedPrompt} categories={categories} onClose={() => setSelectedPrompt(null)} userRating={ratings[selectedPrompt.id] || 0} onRate={handleRatePrompt} isFavorite={favorites.has(selectedPrompt.id)} onToggleFavorite={() => handleToggleFavorite(selectedPrompt)} averageRating={(averageRatings[selectedPrompt.id] || { average: 0 }).average} ratingCount={(averageRatings[selectedPrompt.id] || { count: 0 }).count} onFindSimilar={setSourcePromptForModal} onCommentUpdate={updateCommentCount} onShowcaseUpdate={updateShowcaseCount} onReport={setReportingPrompt} onRemix={(p) => handleAuthAction(() => setPromptToRemix(p))} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} canManage={isAdmin || (currentUser && selectedPrompt.authorId === currentUser.uid)} onAddToCollection={(p) => handleAuthAction(() => setPromptForCollections(p))} onUploadShowcase={(p) => handleAuthAction(() => setPromptForShowcase(p))} />}
            {sourcePromptForModal && <SimilarPromptsModal sourcePrompt={sourcePromptForModal} allPrompts={allPrompts} categories={categories} onClose={() => setSourcePromptForModal(null)} onFindSimilar={setSourcePromptForModal} ratings={ratings} averageRatings={averageRatings} onRatePrompt={handleRatePrompt} favorites={favorites} onToggleFavorite={handleToggleFavorite} commentCounts={commentCounts} onPromptClick={(p) => { setSelectedPrompt(p); setSourcePromptForModal(null); }} onReport={setReportingPrompt} onRemix={(p) => handleAuthAction(() => setPromptToRemix(p))} onAddToCollection={(p) => handleAuthAction(() => setPromptForCollections(p))} showcaseCounts={showcaseCounts} onUploadShowcase={(p) => handleAuthAction(() => setPromptForShowcase(p))} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} />}
            {reportingPrompt && <ReportModal prompt={reportingPrompt} onClose={() => setReportingPrompt(null)} />}
            {promptToRemix && currentUser && userProfile && <RemixPromptModal promptToRemix={promptToRemix} onClose={() => setPromptToRemix(null)} onSubmitSuccess={handleRemixSuccess} categories={categories} currentUser={currentUser} userProfile={userProfile} isPro={!!isPro} />}
            {promptForCollections && <AddToCollectionModal prompt={promptForCollections} userCollections={collections} onClose={() => setPromptForCollections(null)} onCreate={handleCreateCollection} onToggle={handleToggleInCollection} />}
            {promptForShowcase && <ShowcaseUploadModal prompt={promptForShowcase} onClose={() => setPromptForShowcase(null)} onSubmit={handleShowcaseSubmit} />}
        </>
    );
};

export default ProfileModals;
