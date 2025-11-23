
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Reel, UploadMethod, Prompt, ReelCategory } from '../types';
import Spinner from './Spinner';
import CircularProgress from './CircularProgress';
import { uploadImage, getUploadMethodsForRole } from '../services/imageUploadService';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import PromptMediaUpload from './prompt-form/PromptMediaUpload';

interface ReelFormProps {
  initialData: Reel | null;
  onSubmit: (data: Reel | Omit<Reel, 'id' | 'createdAt' | 'likeCount' | 'viewCount'>) => void;
  onClose: () => void;
  isSubmitting: boolean;
  prompts: Prompt[];
  categories: ReelCategory[];
}

const INPUT_STYLE = "block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed";

export const ReelForm: React.FC<ReelFormProps> = ({ initialData, onSubmit, onClose, isSubmitting, prompts, categories }) => {
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [promptId, setPromptId] = useState<string>('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('approved');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [isNSFW, setIsNSFW] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const { t } = useLanguage();
  const { isAdmin, isPro } = useAuth();
  const [error, setError] = useState('');

  // New state for searchable prompt dropdown
  const [promptSearch, setPromptSearch] = useState('');
  const [isPromptDropdownOpen, setIsPromptDropdownOpen] = useState(false);
  const promptSelectRef = useRef<HTMLDivElement>(null);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const progressIntervalRef = useRef<number | null>(null);

  const sortedCategories = useMemo(() => {
    const normalizedCats = categories.map(c => ({
        ...c,
        id: String(c.id),
        // parentId is string type
        parentId: (c.parentId === null || c.parentId === undefined || c.parentId === '0' || c.parentId === '') ? null : String(c.parentId)
    }));

    const childrenMap = new Map<string | null, typeof normalizedCats>();
    normalizedCats.forEach(c => {
        if (!childrenMap.has(c.parentId)) childrenMap.set(c.parentId, []);
        childrenMap.get(c.parentId)!.push(c);
    });

    const result: (ReelCategory & { depth: number })[] = [];

    const traverse = (parentId: string | null, depth: number) => {
        const children = childrenMap.get(parentId);
        if (children) {
            children.sort((a, b) => a.name.localeCompare(b.name));
            children.forEach(child => {
                result.push({ ...child, depth });
                traverse(child.id, depth + 1);
            });
        }
    };
    traverse(null, 0);

    const resultIds = new Set(result.map(r => r.id));
    const missing = normalizedCats.filter(c => !resultIds.has(c.id));
    if (missing.length > 0) {
        missing.sort((a, b) => a.name.localeCompare(b.name));
        missing.forEach(c => result.push({ ...c, depth: 0 }));
    }
    return result;
  }, [categories]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setVideoUrl(initialData.videoUrl || '');
      
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

      setPromptId(initialData.promptId || '');
      const initialPrompt = prompts.find(p => p.id === initialData.promptId);
      setPromptSearch(initialPrompt?.title || '');
      setTagsInput(initialData.tags?.join(', ') || '');
      setStatus(initialData.status || 'approved');
      setCategoryIds(initialData.categoryIds || []);
      setIsNSFW(initialData.isNSFW || false);
    }
  }, [initialData, prompts]);

  useEffect(() => {
      return () => {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      };
  }, []);

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

  const resetProgress = () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setUploadProgress(0);
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (promptSelectRef.current && !promptSelectRef.current.contains(event.target as Node)) {
            setIsPromptDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isUploading || isUploadingVideo) return;
    
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(Boolean);
    
    const reelData = {
        title,
        videoUrl,
        imageUrl: JSON.stringify(imageUrls),
        tags,
        status,
        promptId: promptId || undefined,
        categoryIds,
        isNSFW,
    };
    
    if (initialData) {
        onSubmit({ ...initialData, ...reelData });
    } else {
        onSubmit(reelData);
    }
  };

  const handleCategoryChange = (id: string) => {
    setCategoryIds(prev => {
        const isChecked = prev.includes(id);
        if (isChecked) {
            return prev.filter(catId => catId !== id);
        } else {
            // Auto-select parent
            const newIds = new Set(prev);
            newIds.add(id);
            
            let currentId = id;
            let iterations = 0;
            
            while(currentId && iterations < 100) {
                const currentCategory = categories.find(c => String(c.id) === String(currentId));
                if (currentCategory && currentCategory.parentId && currentCategory.parentId !== '0') {
                    const parentIdStr = String(currentCategory.parentId);
                    newIds.add(parentIdStr);
                    currentId = parentIdStr;
                } else {
                    break;
                }
                iterations++;
            }
            return Array.from(newIds);
        }
    });
  };

  // --- Media Handling Logic (Copied/Adapted from PromptForm) ---
  
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
              setUploadProgress(0);
              startProgressSimulation();
              const result = await uploadImage(file as File, methodOverride, { isPro, isAdmin });
              completeProgress();
              setImageUrls(prev => [...prev, result.imageUrl]);
              await new Promise(resolve => setTimeout(resolve, 500));
          }
      } catch (error) {
          console.error("Upload failed:", error);
          setError("Failed to upload image(s).");
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
          setError("Failed to upload video.");
      } finally {
          setIsUploadingVideo(false);
          if (videoFileInputRef.current) videoFileInputRef.current.value = '';
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

  const sortedPrompts = useMemo(() => {
    return [...prompts].sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
      if (!promptSearch.trim()) {
          if (promptId) return [];
          return sortedPrompts.slice(0, 100);
      }
      return sortedPrompts.filter(p =>
          p.title?.toLowerCase().includes(promptSearch.toLowerCase())
      ).slice(0, 100);
  }, [promptSearch, sortedPrompts, promptId]);
  
  const uploadOptions = getUploadMethodsForRole('image', { isAdmin, isPro });
  const videoUploadOptions = getUploadMethodsForRole('video', { isAdmin, isPro });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{initialData ? t('admin.reelForm.editTitle') : t('admin.reelForm.addTitle')}</h2>
            {error && <p className="text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm text-center">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="reel-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.titleLabel')}</label>
                    <input id="reel-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                        className={`mt-1 ${INPUT_STYLE}`} required />
                </div>

                {/* Media Upload Section using PromptMediaUpload */}
                <PromptMediaUpload
                    imageUrls={imageUrls} setImageUrls={setImageUrls}
                    videoUrl={videoUrl} setVideoUrl={setVideoUrl}
                    
                    // Pass dummy props for unused reference image logic
                    referenceImageUrl={""} setReferenceImageUrl={() => {}}
                    requiresUserImage={false} setRequiresUserImage={() => {}}
                    referenceFileInputRef={useRef<HTMLInputElement>(null)}
                    handleReferenceUploadClick={() => {}}
                    handleReferenceFileChange={() => {}}
                    isRefDragging={false}
                    handleRefDragEvents={() => {}}
                    handleRefDrop={() => {}}
                    isUploadingReference={false}

                    imageDimensions={null}
                    rotation={0} setRotation={() => {}}
                    
                    isUploading={isUploading} isUploadingVideo={isUploadingVideo}
                    uploadProgress={uploadProgress}
                    uploadOptions={uploadOptions} videoUploadOptions={videoUploadOptions}
                    isAdmin={isAdmin} isPro={!!isPro}
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
                    
                    urlInputRef={urlInputRef} fileInputRef={fileInputRef} videoFileInputRef={videoFileInputRef}
                    
                    handleVideoUploadClick={handleVideoUploadClick}
                    handleVideoFileSelected={(e) => e.target.files?.[0] && processVideoFile(e.target.files[0], e.target.getAttribute('data-method') as UploadMethod)}
                    
                    // IMPORTANT: Hide reference image settings for Reels
                    hideReferenceImageSettings={true}
                />

                 <div>
                    <label htmlFor="reel-prompt-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Linked Prompt (Optional)</label>
                    <div className="relative" ref={promptSelectRef}>
                        <input
                            id="reel-prompt-search"
                            type="text"
                            value={promptSearch}
                            onChange={(e) => {
                                setPromptSearch(e.target.value);
                                if (promptId) setPromptId('');
                                setIsPromptDropdownOpen(true);
                            }}
                            onFocus={() => setIsPromptDropdownOpen(true)}
                            placeholder="Search for a prompt by title..."
                            className={`mt-1 ${INPUT_STYLE}`}
                            autoComplete="off"
                        />
                        {promptId && (
                            <button
                                type="button"
                                onClick={() => {
                                    setPromptId('');
                                    setPromptSearch('');
                                }}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                aria-label="Clear selection"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                        {isPromptDropdownOpen && (
                            <ul className="absolute z-10 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                                {filteredPrompts.length > 0 ? filteredPrompts.map(p => (
                                    <li
                                        key={p.id}
                                        onClick={() => {
                                            setPromptId(p.id);
                                            setPromptSearch(p.title || '');
                                            setIsPromptDropdownOpen(false);
                                        }}
                                        className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer"
                                    >
                                        {p.title}
                                    </li>
                                )) : (
                                    <li className="px-3 py-2 text-sm text-gray-500">No prompts found.</li>
                                )}
                            </ul>
                        )}
                    </div>
                </div>

                <div>
                    <label htmlFor="reel-tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.tags')}</label>
                    <input type="text" id="reel-tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                        className={`mt-1 ${INPUT_STYLE}`} placeholder={t('admin.promptForm.tagsPlaceholder')} autoComplete="tags" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.categories')}</label>
                    <div className={`mt-2 space-y-2 border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-gray-100 dark:bg-gray-700 ${isCategoriesExpanded ? '' : 'max-h-40 overflow-y-auto'}`}>
                        {sortedCategories.map(category => (
                            <div key={category.id} className="flex items-center" style={{ paddingLeft: `${category.depth * 30}px` }}>
                                <input 
                                    id={`reel-category-${category.id}`} 
                                    type="checkbox" 
                                    checked={categoryIds.includes(category.id)} 
                                    onChange={() => handleCategoryChange(category.id)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-400 dark:border-gray-500 bg-gray-200 dark:bg-gray-600 rounded" 
                                />
                                <label htmlFor={`reel-category-${category.id}`} className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                                    { category.depth > 0 && <span className="text-gray-400 mr-1">↳</span>}
                                    {category.name}
                                </label>
                            </div>
                        ))}
                        {categories.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.promptForm.noCategories')}</p>}
                    </div>
                     {sortedCategories.length > 5 && (
                        <button
                            type="button"
                            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                            className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none"
                        >
                            {isCategoriesExpanded ? t('common.collapse') : t('common.expand')}
                        </button>
                    )}
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="flex-grow flex flex-col">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('admin.promptForm.isNSFWLabel')}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('admin.promptForm.isNSFWHint')}</span>
                    </span>
                    <label htmlFor="is-nsfw-reel-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="is-nsfw-reel-toggle" className="sr-only peer" checked={isNSFW} onChange={e => setIsNSFW(e.target.checked)} />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                </div>

                 <div>
                    <label htmlFor="reel-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.status')}</label>
                    <select
                        id="reel-status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as 'pending' | 'approved' | 'rejected')}
                        className={`mt-1 ${INPUT_STYLE}`}
                    >
                        <option value="approved">{t('common.approved')}</option>
                        <option value="pending">{t('common.pending')}</option>
                        <option value="rejected">{t('common.rejected')}</option>
                    </select>
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                    <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">{t('common.cancel')}</button>
                    <button type="submit" disabled={isSubmitting || isUploading} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 w-36 flex justify-center">
                        {isSubmitting ? <Spinner size="sm" /> : t('common.save')}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};
