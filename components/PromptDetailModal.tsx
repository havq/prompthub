

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Prompt, Category, Comment, ShowcaseImage, AppSettings, UserProfile } from '../utils/types';
import { useAuth } from '../context/AuthContext';
import { getCommentsForPrompt, addComment, deleteComment, getShowcaseImagesForPrompt, addShowcaseImage, deleteShowcaseImage as apiDeleteShowcaseImage, getUserProfile, incrementViewCount } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import ShowcaseUploadModal from './ShowcaseUploadModal';
import ConfirmModal from './ConfirmModal';
import { getSettings } from '../services/settingsService';
import PhotoGalleryModal from './PhotoGalleryModal';
import LoginSuggestionModal from './LoginSuggestionModal';
import { parseYouTubeUrl, getImageUrls, formatCount } from './PromptDetail/utils';
import MediaViewer from './PromptDetail/MediaViewer';
import PromptInfo from './PromptDetail/PromptInfo';
import CommentsTab from './PromptDetail/CommentsTab';
import ReferenceImageViewer from './PromptCard/ReferenceImageViewer';
// FIX: Import ShowcaseTab to resolve 'Cannot find name' error.
import ShowcaseTab from './PromptDetail/ShowcaseTab';

// Re-export for backward compatibility if needed by other files (e.g. CommentsModal)
export { commentRateLimiter } from './PromptDetail/utils';

interface PromptDetailModalProps {
    prompt: Prompt;
    categories: Category[];
    onClose: () => void;
    userRating: number;
    onRate: (prompt: Prompt, newRating: number) => void;
    isFavorite: boolean;
    onToggleFavorite: () => void;
    averageRating: number;
    ratingCount: number;
    onFindSimilar: (prompt: Prompt) => void;
    onCommentUpdate: (promptId: string, change: number) => void;
    onReport: (prompt: Prompt) => void;
    onRemix: (prompt: Prompt) => void;
    onShowcaseUpdate?: (promptId: string, change: 1 | -1) => void;
    onEdit: (prompt: Prompt) => void;
    onDelete: (prompt: Prompt) => void;
    canManage?: boolean;
    onAddToCollection?: (prompt: Prompt) => void;
    onRemoveFromCollection?: () => void;
    onUploadShowcase?: (prompt: Prompt) => void;
}

export const PromptDetailModal: React.FC<PromptDetailModalProps> = ({ prompt, categories, onClose, onRemix, onShowcaseUpdate, onEdit, onDelete, canManage, ...props }) => {
    const { currentUser, userProfile, isAdmin } = useAuth();
    const { t } = useLanguage();
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(true);
    
    const [isMediaLoaded, setIsMediaLoaded] = useState(false);
    const [mediaError, setMediaError] = useState(false);
    
    const [activeTab, setActiveTab] = useState<'comments' | 'showcase'>('comments');
    const [showcaseImages, setShowcaseImages] = useState<ShowcaseImage[]>([]);
    const [isLoadingShowcase, setIsLoadingShowcase] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [author, setAuthor] = useState<UserProfile | null>(null);

    const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const [galleryState, setGalleryState] = useState<{ open: boolean, index: number }>({ open: false, index: 0 });
    // Reference image modal state is now managed in MediaViewer or lifted here?
    // MediaViewer handles the main image/video display. The reference image viewer is a modal overlay.
    // Let's keep the state here to overlay over everything.
    const [isReferenceImageOpen, setIsReferenceImageOpen] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);

    const [settings, setSettings] = useState<AppSettings>(() => getSettings());
    const [deletingComment, setDeletingComment] = useState<Comment | null>(null);
    const [isDeletingComment, setIsDeletingComment] = useState(false);

    const mediaItems = useMemo(() => {
        const items: { type: 'image' | 'video' | 'youtube'; url: string; id: string }[] = [];
        const imageUrls = getImageUrls(prompt.imageUrl);
        const { videoId } = parseYouTubeUrl(prompt.videoUrl || '');

        if (prompt.videoUrl) {
            if (videoId) {
                items.push({ 
                    type: 'youtube', 
                    url: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&showinfo=0&rel=0`,
                    id: 'video-youtube' 
                });
            } else {
                items.push({ type: 'video', url: prompt.videoUrl, id: 'video-native' });
            }
        }
        
        [...imageUrls].reverse().forEach((url, index) => {
            items.push({ type: 'image', url, id: `image-${index}` });
        });

        return items;
    }, [prompt.imageUrl, prompt.videoUrl]);

    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    
    const goToNext = useCallback(() => {
        setCurrentMediaIndex(prevIndex => (prevIndex + 1) % mediaItems.length);
    }, [mediaItems.length]);

    const goToPrev = useCallback(() => {
        setCurrentMediaIndex(prevIndex => (prevIndex - 1 + mediaItems.length) % mediaItems.length);
    }, [mediaItems.length]);

    useEffect(() => {
        const originalTitle = document.title;
        const originalDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
        const originalKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content');

        const setMetaTag = (name: string, content: string) => {
            let element = document.querySelector(`meta[name="${name}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute('name', name);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        const removeMetaTag = (name: string) => {
            const element = document.querySelector(`meta[name="${name}"]`);
            if (element) {
                document.head.removeChild(element);
            }
        };

        const newTitle = `${String(prompt.text || '').substring(0, 50)}... | ${t('header.title')}`;
        document.title = newTitle;
        setMetaTag('description', String(prompt.text || ''));
        if (prompt.tags && prompt.tags.length > 0) {
            setMetaTag('keywords', prompt.tags.join(', '));
        } else {
            removeMetaTag('keywords');
        }

        return () => {
            document.title = originalTitle;
            if (originalDescription) {
                setMetaTag('description', originalDescription);
            } else {
                removeMetaTag('description');
            }
             if (originalKeywords) {
                setMetaTag('keywords', originalKeywords);
            }
        };
    }, [prompt, t]);

    useEffect(() => {
        incrementViewCount(prompt.id).catch(err => console.error("Failed to increment view count", err));
    }, [prompt.id]);

    useEffect(() => {
        if (prompt.authorId) {
            let isMounted = true;
            getUserProfile(prompt.authorId).then(profile => {
                if (isMounted) {
                    setAuthor(profile);
                }
            });
            return () => { isMounted = false; };
        } else {
            setAuthor(null);
        }
    }, [prompt.authorId]);

    useEffect(() => {
        const handleSettingsChange = () => {
            setSettings(getSettings());
        };
        window.addEventListener('storage', handleSettingsChange);
        return () => window.removeEventListener('storage', handleSettingsChange);
    }, []);

    const { commentsGloballyEnabled, promptCardSettings } = settings;
    const showRemixButtonSetting = promptCardSettings?.showRemixButton ?? true;
    const showCopyButtonSetting = promptCardSettings?.showCopyButton ?? true;
    const commentsEnabledForPrompt = prompt.commentsEnabled ?? true;
    const canComment = commentsGloballyEnabled && commentsEnabledForPrompt;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            } else if (event.key === 'ArrowRight') {
                goToNext();
            } else if (event.key === 'ArrowLeft') {
                goToPrev();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, goToNext, goToPrev]);

    useEffect(() => {
        // Logic for adjusting image container height based on scroll
        const scrollable = scrollContainerRef.current;
        const imageContainer = imageContainerRef.current;
        if (!scrollable || !imageContainer) return;

        let initialHeight = 0;
        let isMobile = window.innerWidth < 768;

        const updateImageHeight = () => {
            if (!isMobile) {
                if (imageContainer.style.height !== '') {
                    imageContainer.style.height = '';
                }
                return;
            }
            
            if (initialHeight === 0) {
                initialHeight = imageContainer.offsetWidth;
            }

            const scrollTop = scrollable.scrollTop;
            const minHeight = 100;
            
            const newHeight = Math.max(minHeight, initialHeight - scrollTop);
            
            if (imageContainer.style.height !== `${newHeight}px`) {
                imageContainer.style.height = `${newHeight}px`;
            }
        };

        const handleResize = () => {
            const wasMobile = isMobile;
            isMobile = window.innerWidth < 768;

            if (wasMobile && !isMobile) {
                imageContainer.style.height = '';
            }
            initialHeight = 0;
        };

        scrollable.addEventListener('scroll', updateImageHeight, { passive: true });
        window.addEventListener('resize', handleResize);

        handleResize();
        setTimeout(() => {
            if (isMobile) {
                initialHeight = imageContainer.offsetWidth;
            }
        }, 100);

        return () => {
            scrollable.removeEventListener('scroll', updateImageHeight);
            window.removeEventListener('resize', handleResize);
            if (imageContainer) {
                imageContainer.style.height = '';
            }
        };
    }, []);

    const fetchComments = useCallback(async () => {
        setIsLoadingComments(true);
        try {
            const commentsData = await getCommentsForPrompt(prompt.id);
            setComments(commentsData);
        } catch (error) {
            console.error("Failed to fetch comments:", error);
        } finally {
            setIsLoadingComments(false);
        }
    }, [prompt.id]);

    const fetchShowcase = useCallback(async () => {
        setIsLoadingShowcase(true);
        try {
            const showcaseData = await getShowcaseImagesForPrompt(prompt.id);
            setShowcaseImages(showcaseData);
        } catch (error) {
            console.error("Failed to fetch showcase images:", error);
        } finally {
            setIsLoadingShowcase(false);
        }
    }, [prompt.id]);

    useEffect(() => {
        fetchComments();
        fetchShowcase();
    }, [fetchComments, fetchShowcase]);

    useEffect(() => {
        const firstMedia = mediaItems[0];
        if (!firstMedia) {
            setMediaError(true);
            return;
        }

        if (firstMedia.type === 'video' || firstMedia.type === 'youtube') {
            setIsMediaLoaded(true);
        } else if (firstMedia.type === 'image') {
            const img = new Image();
            img.src = firstMedia.url;
            img.onload = () => setIsMediaLoaded(true);
            img.onerror = () => setMediaError(true);
        } else {
            setMediaError(true);
        }
    }, [mediaItems]);

    const handlePostComment = async (text: string, parentId: string | null = null) => {
        await addComment({
            promptId: prompt.id,
            parentId,
            text: text,
            userId: currentUser.uid,
            username: userProfile!.username,
            userPhotoURL: userProfile!.photoURL,
        });
        await fetchComments();
        props.onCommentUpdate(prompt.id, 1);
    };

    const handleConfirmDeleteComment = async () => {
        if(!currentUser || !deletingComment) return;
        setIsDeletingComment(true);
        try {
            const result = await deleteComment(deletingComment.id, currentUser.uid);
            if (result) {
                props.onCommentUpdate(prompt.id, -result.deletedCount);
                await fetchComments();
            }
        } catch (error) {
            console.error("Failed to delete comment:", error);
            alert("Could not delete comment. You may not have permission.");
        } finally {
            setIsDeletingComment(false);
            setDeletingComment(null);
        }
    };

    const handleShowcaseSubmit = async (imageUrl: string) => {
        if (!currentUser || !userProfile) return;
        try {
            await addShowcaseImage({
                promptId: prompt.id,
                userId: currentUser.uid,
                username: userProfile.username,
                userPhotoURL: userProfile.photoURL,
                imageUrl,
            });
            fetchShowcase();
            if (onShowcaseUpdate) {
                onShowcaseUpdate(prompt.id, 1);
            }
        } catch(error) {
            console.error("Failed to submit showcase image:", error);
        }
    };
    
    const handleShowcaseUploadClick = () => {
        if (currentUser) {
            setIsUploadModalOpen(true);
        } else {
            setIsLoginModalOpen(true);
        }
    };

    const handleDeleteShowcaseImage = async () => {
        if (!deletingImageId || !currentUser) return;
        setIsDeleting(true);
        try {
            await apiDeleteShowcaseImage(deletingImageId, currentUser.uid);
            fetchShowcase();
            if (onShowcaseUpdate) {
                onShowcaseUpdate(prompt.id, -1);
            }
        } catch(error) {
            console.error("Failed to delete showcase image:", error);
        } finally {
            setIsDeleting(false);
            setDeletingImageId(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true">
            {isUploadModalOpen && <ShowcaseUploadModal prompt={prompt} onClose={() => setIsUploadModalOpen(false)} onSubmit={handleShowcaseSubmit} />}
            {isLoginModalOpen && <LoginSuggestionModal onClose={() => setIsLoginModalOpen(false)} />}
            {deletingImageId && <ConfirmModal isOpen={!!deletingImageId} onClose={() => setDeletingImageId(null)} onConfirm={handleDeleteShowcaseImage} title={t('common.delete')} message={t('modals.showcase.deleteConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isDeleting} />}
            {deletingComment && <ConfirmModal isOpen={!!deletingComment} onClose={() => setDeletingComment(null)} onConfirm={handleConfirmDeleteComment} title={t('common.delete')} message={t('promptDetail.deleteCommentConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isDeletingComment} />}
            {galleryState.open && <PhotoGalleryModal images={showcaseImages} startIndex={galleryState.index} onClose={() => setGalleryState({open: false, index: 0})} />}
            
            <ReferenceImageViewer 
                isOpen={isReferenceImageOpen} 
                imageUrl={prompt.referenceImageUrl} 
                onClose={() => setIsReferenceImageOpen(false)} 
            />

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-8xl h-[90vh] relative flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="absolute -top-5 -right-4 z-50">
                    <button onClick={onClose} className="p-1 rounded-full bg-purple-500 bg-black/30 text-white hover:bg-black/50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex flex-col md:flex-row h-full">
                    {/* Left Side: Media Viewer */}
                    <MediaViewer
                        mediaItems={mediaItems}
                        currentMediaIndex={currentMediaIndex}
                        setCurrentMediaIndex={setCurrentMediaIndex}
                        goToPrev={goToPrev}
                        goToNext={goToNext}
                        prompt={prompt}
                        isMediaLoaded={isMediaLoaded}
                        mediaError={mediaError}
                        canManage={!!canManage}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onReferenceImageClick={() => setIsReferenceImageOpen(true)}
                        containerRef={imageContainerRef}
                    />

                    {/* Right Side: Details & Tabs */}
                    <div className="w-full md:w-1/2 flex flex-col min-h-0">
                        <div ref={scrollContainerRef} className="flex-grow overflow-y-auto">
                            <PromptInfo
                                prompt={prompt}
                                author={author}
                                categories={categories}
                                averageRating={props.averageRating}
                                ratingCount={props.ratingCount}
                                userRating={props.userRating}
                                isFavorite={props.isFavorite}
                                showcaseCount={showcaseImages.length}
                                onRate={(rating) => props.onRate(prompt, rating)}
                                onToggleFavorite={props.onToggleFavorite}
                                onFindSimilar={() => props.onFindSimilar(prompt)}
                                onRemix={() => onRemix(prompt)}
                                onReport={() => props.onReport(prompt)}
                                onClose={onClose}
                                showCopyButtonSetting={showCopyButtonSetting}
                                showRemixButtonSetting={showRemixButtonSetting}
                                promptDetailAdSettings={settings.promptDetailAdSettings}
                                onAddToCollection={props.onAddToCollection ? () => props.onAddToCollection!(prompt) : undefined}
                                onRemoveFromCollection={props.onRemoveFromCollection}
                            />

                            <div className="border-t border-gray-200 dark:border-gray-700 mt-6 px-6 pb-6">
                                <div className="border-b border-gray-200 dark:border-gray-700">
                                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                        <button onClick={() => setActiveTab('comments')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'comments' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                            {t('promptDetail.commentsTab')} ({formatCount(prompt.commentCount)})
                                        </button>
                                        <button onClick={() => setActiveTab('showcase')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'showcase' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                            {t('promptDetail.showcaseTab')} ({formatCount(showcaseImages.length)})
                                        </button>
                                    </nav>
                                </div>
                                <div className="mt-6">
                                    {activeTab === 'comments' ? (
                                        <CommentsTab
                                            prompt={prompt}
                                            comments={comments}
                                            isLoadingComments={isLoadingComments}
                                            canComment={canComment}
                                            currentUser={currentUser}
                                            userProfile={userProfile}
                                            onPostComment={handlePostComment}
                                            onDeleteComment={setDeletingComment}
                                            onRefresh={fetchComments}
                                            onClose={onClose}
                                            settings={settings}
                                        />
                                    ) : (
                                        <ShowcaseTab
                                            showcaseImages={showcaseImages}
                                            isLoadingShowcase={isLoadingShowcase}
                                            onUploadClick={handleShowcaseUploadClick}
                                            onGalleryOpen={(index) => setGalleryState({ open: true, index })}
                                            onDeleteClick={setDeletingImageId}
                                            currentUser={currentUser}
                                            isAdmin={isAdmin}
                                            onClose={onClose}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
