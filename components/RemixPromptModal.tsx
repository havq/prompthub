
import React, { useState, useRef, useEffect } from 'react';
import { Prompt, UserProfile, UploadMethod, CategoryWithCount, PromptTextEntry } from '../utils/types';
import { useLanguage } from '../context/LanguageContext';
import { remixPrompt } from '../services/api';
import Spinner from './Spinner';
import PromptBasicDetails from './prompt-form/PromptBasicDetails';
import MediaPreview from './remix/MediaPreview';
import { uploadImage, getUploadMethodsForRole } from '../services/imageUploadService';
import { GoogleGenAI } from '@google/genai';
import PromptMediaUpload from './prompt-form/PromptMediaUpload';
import PromptAdvancedSettings from './prompt-form/PromptAdvancedSettings';

interface RemixPromptModalProps {
  promptToRemix: Prompt;
  onClose: () => void;
  onSubmitSuccess: () => void;
  categories: CategoryWithCount[];
  currentUser: any;
  userProfile: UserProfile;
  isPro: boolean;
}

const INPUT_STYLE = "block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed";

const RemixPromptModal: React.FC<RemixPromptModalProps> = ({
    promptToRemix, onClose, onSubmitSuccess, categories, currentUser, userProfile, isPro
}) => {
    const { t } = useLanguage();
    const isAdmin = userProfile.role === 'Admin';

    // Basic Details
    const [title, setTitle] = useState(`Remix of ${promptToRemix.title}`);
    
    // Multi-language Text State
    const [promptTexts, setPromptTexts] = useState<PromptTextEntry[]>([{ lang: 'Tiếng Việt', text: '' }]);
    const [activeLangIndex, setActiveLangIndex] = useState(0);

    const [promptNote, setPromptNote] = useState(promptToRemix.promptNote || '');
    const [promptSource, setPromptSource] = useState(promptToRemix.promptSource || '');
    const [tagsInput, setTagsInput] = useState(promptToRemix.tags?.join(', ') || '');
    const [isSuggestingTags, setIsSuggestingTags] = useState(false);
    const [suggestTagsError, setSuggestTagsError] = useState('');

    // Media State
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [videoUrl, setVideoUrl] = useState('');
    const [referenceImageUrl, setReferenceImageUrl] = useState('');
    const [requiresUserImage, setRequiresUserImage] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
    
    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [isUploadingReference, setIsUploadingReference] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isRefDragging, setIsRefDragging] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Settings
    const [categoryIds, setCategoryIds] = useState<string[]>(promptToRemix.categoryIds || []);
    const [isPrivate, setIsPrivate] = useState(false);
    const [isNSFW, setIsNSFW] = useState(false);
    const [commentsEnabled, setCommentsEnabled] = useState(true);
    const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>(isAdmin ? 'approved' : 'pending');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refs
    const urlInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoFileInputRef = useRef<HTMLInputElement>(null);
    const referenceFileInputRef = useRef<HTMLInputElement>(null);
    const progressIntervalRef = useRef<number | null>(null);

    // Pre-fill data from promptToRemix
    useEffect(() => {
        if (promptToRemix.imageUrl) {
            if (promptToRemix.imageUrl.startsWith('[') && promptToRemix.imageUrl.endsWith(']')) {
                try {
                    const parsed = JSON.parse(promptToRemix.imageUrl);
                    setImageUrls(Array.isArray(parsed) ? parsed : [promptToRemix.imageUrl]);
                } catch (e) {
                    setImageUrls([promptToRemix.imageUrl]);
                }
            } else {
                setImageUrls([promptToRemix.imageUrl]);
            }
        }
        
        if (promptToRemix.videoUrl) {
            setVideoUrl(promptToRemix.videoUrl);
        }

        if (promptToRemix.referenceImageUrl) {
            setReferenceImageUrl(promptToRemix.referenceImageUrl);
        }

        if (promptToRemix.requiresUserImage) {
            setRequiresUserImage(promptToRemix.requiresUserImage);
        }

        if (promptToRemix.rotation) {
            setRotation(promptToRemix.rotation);
        }

        // Parse Text (JSON or String)
        if (promptToRemix.text) {
            let initialTexts: PromptTextEntry[] = [{ lang: 'Tiếng Việt', text: '' }];
            try {
                const parsed = JSON.parse(promptToRemix.text);
                if (Array.isArray(parsed) && parsed.length > 0 && 'lang' in parsed[0] && 'text' in parsed[0]) {
                    initialTexts = parsed;
                } else if (typeof parsed === 'string') {
                    initialTexts = [{ lang: 'Tiếng Việt', text: parsed }];
                } else {
                    // Fallback for legacy data
                    initialTexts = [{ lang: 'Tiếng Việt', text: promptToRemix.text }];
                }
            } catch (e) {
                initialTexts = [{ lang: 'Tiếng Việt', text: promptToRemix.text }];
            }
            setPromptTexts(initialTexts);
        }
        
    }, [promptToRemix]);

    const handleSuggestTags = async () => {
        const currentText = promptTexts[activeLangIndex]?.text || '';
        if (!currentText.trim() || isSuggestingTags) return;
        
        if (!process.env.API_KEY) {
            setSuggestTagsError("AI API Key not configured.");
            return;
        }
        setIsSuggestingTags(true);
        setSuggestTagsError('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const result = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Suggest 5 relevant tags for this prompt, separated by commas: "${currentText}"`,
            });
            const tags = result.text.split(',').map(t => t.trim()).join(', ');
            setTagsInput(prev => prev ? `${prev}, ${tags}` : tags);
        } catch (error) {
            console.error("AI Tag Suggestion Error:", error);
            setSuggestTagsError("Failed to generate tags.");
        } finally {
            setIsSuggestingTags(false);
        }
    };
    
    const startProgressSimulation = () => {
        setUploadProgress(0);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = window.setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) return prev;
                return prev + Math.random() * 10;
            });
        }, 300);
    };
    const completeProgress = () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setUploadProgress(100);
    };
    useEffect(() => {
        return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
    }, []);

    // --- Upload Handlers (Copied from PromptForm) ---
    const handleUploadClick = (method?: UploadMethod) => {
        if (fileInputRef.current) {
            fileInputRef.current.setAttribute('data-method', method || '');
            fileInputRef.current.click();
        }
    };
    
    const processImageFiles = async (files: FileList | File[], methodOverride?: UploadMethod) => {
        setIsUploading(true);
        startProgressSimulation();
        const newUrls: string[] = [];
        try {
            for (const file of Array.from(files)) {
                const result = await uploadImage(file, methodOverride, { isPro, isAdmin });
                newUrls.push(result.imageUrl);
            }
            setImageUrls(prev => [...prev, ...newUrls]);
            completeProgress();
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Failed to upload image(s).");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleVideoUploadClick = (method?: UploadMethod) => {
        if (videoFileInputRef.current) {
            videoFileInputRef.current.setAttribute('data-method', method || '');
            videoFileInputRef.current.click();
        }
    };
  
    const processVideoFile = async (file: File, methodOverride?: UploadMethod) => {
        setIsUploadingVideo(true);
        startProgressSimulation();
        try {
            const result = await uploadImage(file, methodOverride, { isPro, isAdmin });
            if (result.videoUrl) {
                setVideoUrl(result.videoUrl);
                if (result.imageUrl && imageUrls.length === 0) {
                    setImageUrls([result.imageUrl]);
                }
            }
            completeProgress();
        } catch (error) {
            console.error("Video upload failed:", error);
            alert("Failed to upload video.");
        } finally {
            setIsUploadingVideo(false);
            if (videoFileInputRef.current) videoFileInputRef.current.value = '';
        }
    };

    const handleReferenceUploadClick = (method?: UploadMethod) => {
        if (referenceFileInputRef.current) {
            referenceFileInputRef.current.setAttribute('data-method', method || '');
            referenceFileInputRef.current.click();
        }
    };
  
    const processReferenceFile = async (file: File, methodOverride?: UploadMethod) => {
        setIsUploadingReference(true);
        startProgressSimulation();
        try {
            const result = await uploadImage(file, methodOverride, { isPro, isAdmin });
            setReferenceImageUrl(result.imageUrl);
            completeProgress();
        } catch (error) {
            console.error("Ref image upload failed:", error);
            alert("Failed to upload reference image.");
        } finally {
            setIsUploadingReference(false);
            if (referenceFileInputRef.current) referenceFileInputRef.current.value = '';
        }
    };

    const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processImageFiles(e.dataTransfer.files);
        }
    };

    const handleDragStart = (index: number) => setDraggedIndex(index);
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedIndex === null || draggedIndex === index) return;
        const newUrls = [...imageUrls];
        const draggedItem = newUrls[draggedIndex];
        newUrls.splice(draggedIndex, 1);
        newUrls.splice(index, 0, draggedItem);
        setImageUrls(newUrls);
        setDraggedIndex(index);
    };

    const handleCategoryChange = (id: string) => {
        setCategoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Handle pending image URL input
        let finalImageUrls = [...imageUrls];
        if (urlInputRef.current && urlInputRef.current.value.trim()) {
            finalImageUrls.push(urlInputRef.current.value.trim());
            urlInputRef.current.value = '';
        }

        const hasText = promptTexts.some(entry => entry.text.trim() !== '');
        if (!hasText) {
            alert("Please enter prompt text for at least one language.");
            return;
        }

        setIsSubmitting(true);

        try {
            await remixPrompt({
                title, 
                text: JSON.stringify(promptTexts), // Serialize multi-lang text
                promptNote: promptNote || undefined, 
                promptSource: promptSource || undefined,
                imageUrl: JSON.stringify(finalImageUrls), // Send as JSON array string
                videoUrl: videoUrl || undefined, 
                referenceImageUrl: requiresUserImage ? referenceImageUrl : undefined,
                categoryIds, tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
                authorId: currentUser.uid,
                authorName: userProfile.username,
                authorPhotoURL: userProfile.photoURL,
                remixedFrom: promptToRemix.id,
                status, // Use the status from state
                requiresUserImage, isPrivate, isNSFW, commentsEnabled, rotation
            }, promptToRemix.id);
            
            onSubmitSuccess();
            onClose();
        } catch (error) {
            console.error("Remix failed:", error);
            alert("Failed to create remix.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const uploadOptions = getUploadMethodsForRole('image', { isPro, isAdmin });
    const videoUploadOptions = getUploadMethodsForRole('video', { isPro, isAdmin });

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('promptCard.remix')}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <PromptBasicDetails 
                                    title={title} setTitle={setTitle} 
                                    promptTexts={promptTexts} 
                                    setPromptTexts={setPromptTexts}
                                    activeLangIndex={activeLangIndex}
                                    setActiveLangIndex={setActiveLangIndex}
                                    promptNote={promptNote} setPromptNote={setPromptNote}
                                    promptSource={promptSource} setPromptSource={setPromptSource}
                                    tagsInput={tagsInput} setTagsInput={setTagsInput} 
                                    onSuggestTags={handleSuggestTags} 
                                    isSuggestingTags={isSuggestingTags} 
                                    suggestTagsError={suggestTagsError} 
                                    INPUT_STYLE={INPUT_STYLE} 
                                    t={t}
                                />
                            </div>
                            <div className="space-y-4">
                                {(imageUrls.length > 0 || videoUrl || referenceImageUrl) && (
                                    <div className="mb-4">
                                        <MediaPreview 
                                            imageUrl={imageUrls[0]} 
                                            videoUrl={videoUrl} 
                                            referenceImageUrl={referenceImageUrl} 
                                            rotation={rotation} 
                                        />
                                    </div>
                                )}
                                
                                <PromptMediaUpload
                                    imageUrls={imageUrls} setImageUrls={setImageUrls}
                                    videoUrl={videoUrl} setVideoUrl={setVideoUrl}
                                    referenceImageUrl={referenceImageUrl} setReferenceImageUrl={setReferenceImageUrl}
                                    requiresUserImage={requiresUserImage} setRequiresUserImage={setRequiresUserImage}
                                    imageDimensions={imageDimensions}
                                    rotation={rotation} setRotation={setRotation}
                                    isUploading={isUploading} isUploadingVideo={isUploadingVideo} isUploadingReference={isUploadingReference}
                                    uploadProgress={uploadProgress}
                                    uploadOptions={uploadOptions} videoUploadOptions={videoUploadOptions}
                                    isAdmin={isAdmin} isPro={isPro}
                                    INPUT_STYLE={INPUT_STYLE} t={t}
                                    handleUploadClick={handleUploadClick}
                                    handleImageFilesSelected={(e) => processImageFiles(e.target.files || [] as any, e.target.getAttribute('data-method') as UploadMethod)}
                                    handleImageDrop={handleImageDrop}
                                    handleDragStart={handleDragStart} handleDragOver={handleDragOver}
                                    handleDragEvents={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(e.type === 'dragenter' || e.type === 'dragover'); }}
                                    isDragging={isDragging}
                                    draggedIndex={draggedIndex}
                                    setDraggedIndex={setDraggedIndex}
                                    handleRemoveImage={(index) => setImageUrls(prev => prev.filter((_, i) => i !== index))}
                                    addUrlFromInput={() => { if (urlInputRef.current?.value) { setImageUrls(prev => [...prev, urlInputRef.current!.value]); urlInputRef.current.value = ''; } }}
                                    urlInputRef={urlInputRef} fileInputRef={fileInputRef} videoFileInputRef={videoFileInputRef} referenceFileInputRef={referenceFileInputRef}
                                    handleVideoUploadClick={handleVideoUploadClick}
                                    handleVideoFileSelected={(e) => e.target.files?.[0] && processVideoFile(e.target.files[0], e.target.getAttribute('data-method') as UploadMethod)}
                                    handleReferenceUploadClick={handleReferenceUploadClick}
                                    handleReferenceFileChange={(e) => e.target.files?.[0] && processReferenceFile(e.target.files[0], e.target.getAttribute('data-method') as UploadMethod)}
                                    isRefDragging={isRefDragging}
                                    handleRefDragEvents={(e) => { e.preventDefault(); e.stopPropagation(); setIsRefDragging(e.type === 'dragenter' || e.type === 'dragover'); }}
                                    handleRefDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsRefDragging(false); if(e.dataTransfer.files?.[0]) processReferenceFile(e.dataTransfer.files[0]); }}
                                />

                                <PromptAdvancedSettings
                                    categories={categories} categoryIds={categoryIds} handleCategoryChange={handleCategoryChange}
                                    isUserAdmin={isAdmin} authorId={currentUser.uid} setAuthorId={() => {}} 
                                    users={[]} 
                                    t={t}
                                    status={status} setStatus={setStatus}
                                    isPro={isPro}
                                    isPrivate={isPrivate} setIsPrivate={setIsPrivate}
                                    isNSFW={isNSFW} setIsNSFW={setIsNSFW}
                                    commentsEnabled={commentsEnabled} setCommentsEnabled={setCommentsEnabled}
                                    INPUT_STYLE={INPUT_STYLE}
                                />
                            </div>
                        </div>
                    </form>
                </div>
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4 flex-shrink-0">
                    <button onClick={onClose} className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">{t('common.cancel')}</button>
                    <button onClick={handleSubmit} disabled={isSubmitting || isUploading || isUploadingVideo || isUploadingReference} className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 w-36 flex justify-center">
                        {isSubmitting ? <Spinner size="sm" /> : t('promptCard.remix')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RemixPromptModal;
