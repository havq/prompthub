

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Prompt, CategoryWithCount, UserProfile, UploadMethod, PromptTextEntry } from '../utils/types';
import { useLanguage } from '../context/LanguageContext';
import Spinner from './Spinner';
import PromptBasicDetails from './prompt-form/PromptBasicDetails';
import PromptMediaUpload from './prompt-form/PromptMediaUpload';
import PromptAdvancedSettings from './prompt-form/PromptAdvancedSettings';
import MediaPreview from './remix/MediaPreview';
import { uploadImage, getUploadMethodsForRole } from '../services/imageUploadService';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../context/AuthContext';
import { getAllUsers } from '../services/api';

interface PromptFormProps {
  initialData: Prompt | null;
  categories: CategoryWithCount[];
  users: UserProfile[];
  onSubmit: (data: Prompt | Omit<Prompt, 'id' | 'createdAt'>) => void;
  onClose: () => void;
  isSubmitting: boolean;
  isUserAdmin: boolean;
  isPro: boolean;
  inline?: boolean;
}

const INPUT_STYLE = "block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed";

export const PromptForm: React.FC<PromptFormProps> = ({
    initialData, categories, users: propUsers, onSubmit, onClose, isSubmitting, isUserAdmin, isPro, inline = false
}) => {
    const { t } = useLanguage();
    const { currentUser } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>(propUsers);

    // Basic Details
    const [title, setTitle] = useState('');
    const [promptTexts, setPromptTexts] = useState<PromptTextEntry[]>([{ lang: 'Tiếng Việt', text: '' }]);
    const [activeLangIndex, setActiveLangIndex] = useState(0);
    const [promptNote, setPromptNote] = useState('');
    const [promptSource, setPromptSource] = useState('');
    const [tagsInput, setTagsInput] = useState('');
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
    const [categoryIds, setCategoryIds] = useState<string[]>([]);
    const [isPrivate, setIsPrivate] = useState(false);
    const [isNSFW, setIsNSFW] = useState(false);
    const [commentsEnabled, setCommentsEnabled] = useState(true);
    const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [authorId, setAuthorId] = useState('');

    // Refs
    const urlInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoFileInputRef = useRef<HTMLInputElement>(null);
    const referenceFileInputRef = useRef<HTMLInputElement>(null);
    const progressIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        setUsers(propUsers);
    }, [propUsers]);

    // If admin and user list is empty, fetch it.
    // This allows us to remove the heavy getAllUsers call from the homepage logic
    // and only load it here when the form is actually rendered.
    useEffect(() => {
        if (isUserAdmin && users.length === 0) {
            getAllUsers().then(fetchedUsers => {
                setUsers(fetchedUsers);
            }).catch(err => console.error("Failed to fetch users for PromptForm", err));
        }
    }, [isUserAdmin]);

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title || '');
            
            let initialTexts: PromptTextEntry[] = [{ lang: 'Tiếng Việt', text: '' }];
            if (initialData.text) {
                try {
                    const parsed = JSON.parse(initialData.text);
                    if (Array.isArray(parsed) && parsed.length > 0 && 'lang' in parsed[0] && 'text' in parsed[0]) {
                        initialTexts = parsed;
                    } else if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
                        initialTexts = Object.entries(parsed).map(([lang, text]) => ({ lang, text: String(text) }));
                    } else if (typeof parsed === 'string') {
                         initialTexts = [{ lang: 'Tiếng Việt', text: parsed }];
                    }
                } catch (e) {
                    initialTexts = [{ lang: 'Tiếng Việt', text: initialData.text }];
                }
            }
            setPromptTexts(initialTexts);
            setActiveLangIndex(0);

            setPromptNote(initialData.promptNote || '');
            setPromptSource(initialData.promptSource || '');
            setTagsInput(initialData.tags?.join(', ') || '');
            
            if (initialData.imageUrl) {
                if (initialData.imageUrl.startsWith('[') && initialData.imageUrl.endsWith(']')) {
                    try {
                        const parsed = JSON.parse(initialData.imageUrl);
                        setImageUrls(Array.isArray(parsed) ? parsed : [initialData.imageUrl]);
                    } catch (e) {
                        setImageUrls([initialData.imageUrl]);
                    }
                } else {
                    setImageUrls([initialData.imageUrl]);
                }
            }
            
            setVideoUrl(initialData.videoUrl || '');
            setReferenceImageUrl(initialData.referenceImageUrl || '');
            setRequiresUserImage(initialData.requiresUserImage || false);
            setRotation(initialData.rotation || 0);
            
            setCategoryIds(initialData.categoryIds || []);
            setIsPrivate(initialData.isPrivate || false);
            setIsNSFW(initialData.isNSFW || false);
            setCommentsEnabled(initialData.commentsEnabled ?? true);
            setStatus(initialData.status || 'approved');
            setAuthorId(initialData.authorId || '');
        } else {
            // Defaults for new prompt
            setPromptTexts([{ lang: 'Tiếng Việt', text: '' }]);
            setActiveLangIndex(0);
            setStatus(isUserAdmin ? 'approved' : 'pending');
            // Auto-select current user as author for new prompts if admin/user
            if (currentUser) {
                setAuthorId(currentUser.uid);
            }
        }
    }, [initialData, isUserAdmin, currentUser]);

    useEffect(() => {
        return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
    }, []);

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

    const handleUploadClick = (method?: UploadMethod) => {
        if (fileInputRef.current) {
            fileInputRef.current.setAttribute('data-method', method || '');
            fileInputRef.current.click();
        }
    };

    const processImageFiles = async (files: FileList | File[], methodOverride?: UploadMethod) => {
        const fileArray = Array.from(files as any);
        if (fileArray.length === 0) return;

        setIsUploading(true);
        startProgressSimulation();

        try {
            for (const file of fileArray) {
                // Reset and start progress for each file to provide better feedback
                setUploadProgress(0);
                startProgressSimulation();
                
                const result = await uploadImage(file as File, methodOverride, { isPro, isAdmin: isUserAdmin });
                
                // Finish progress for this file
                completeProgress();
                
                // Immediately update state to show the image
                setImageUrls(prev => [...prev, result.imageUrl]);
                
                // Small delay for UI to reflect completion before next start
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Failed to upload image(s).");
        } finally {
            setIsUploading(false);
            setUploadProgress(0); 
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
            const result = await uploadImage(file, methodOverride, { isPro, isAdmin: isUserAdmin });
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
            const result = await uploadImage(file, methodOverride, { isPro, isAdmin: isUserAdmin });
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
        if (isSubmitting || isUploading || isUploadingVideo || isUploadingReference) return;

        const hasText = promptTexts.some(entry => entry.text.trim() !== '');
        if (!hasText) {
            alert("Please enter prompt text for at least one language.");
            return;
        }

        const promptData: any = {
            title, text: JSON.stringify(promptTexts), promptNote: promptNote || undefined, promptSource: promptSource || undefined,
            imageUrl: JSON.stringify(imageUrls),
            videoUrl: videoUrl || undefined,
            referenceImageUrl: requiresUserImage ? referenceImageUrl : undefined,
            categoryIds, tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
            requiresUserImage, isPrivate, isNSFW, commentsEnabled, rotation,
            status
        };

        if (isUserAdmin && authorId) {
            promptData.authorId = authorId;
        }

        if (initialData) {
            onSubmit({ ...initialData, ...promptData });
        } else {
            onSubmit(promptData);
        }
    };

    const uploadOptions = getUploadMethodsForRole('image', { isPro, isAdmin: isUserAdmin });
    const videoUploadOptions = getUploadMethodsForRole('video', { isPro, isAdmin: isUserAdmin });

    const content = (
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
                        isAdmin={isUserAdmin} isPro={isPro}
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
                        isUserAdmin={isUserAdmin} authorId={authorId} setAuthorId={setAuthorId}
                        users={users}
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
            {!inline && (
                 <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4 flex-shrink-0 -mx-6 -mb-6 mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                    <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">{t('common.cancel')}</button>
                    <button type="submit" disabled={isSubmitting || isUploading || isUploadingVideo || isUploadingReference} className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 w-36 flex justify-center">
                        {isSubmitting ? <Spinner size="sm" /> : (initialData ? t('common.save') : t('home.submitPrompt'))}
                    </button>
                </div>
            )}
            {inline && (
                <div className="flex justify-end mt-6">
                    <button type="submit" disabled={isSubmitting || isUploading || isUploadingVideo || isUploadingReference} className="py-2 px-8 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex justify-center">
                        {isSubmitting ? <Spinner size="sm" /> : t('home.submitPrompt')}
                    </button>
                </div>
            )}
        </form>
    );

    if (inline) {
        return <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">{content}</div>;
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{initialData ? t('admin.promptForm.editTitle') : t('admin.promptForm.addTitle')}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow">
                    {content}
                </div>
            </div>
        </div>
    );
};