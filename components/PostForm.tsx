
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Post, Category, UserProfile, UploadMethod } from '../types';
import Spinner from './Spinner';
import CircularProgress from './CircularProgress';
import { uploadImage, getUploadMethodsForRole } from '../services/imageUploadService';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getSettings } from '../services/settingsService';
import ImageCropModal from './ImageCropModal';

declare global {
    interface Window {
        Quill: any;
        quillLoadingPromise: Promise<void> | null;
    }
}

interface PostFormProps {
  initialData: Post | null;
  categories: Category[];
  users: UserProfile[];
  onSubmit: (data: Post | Omit<Post, 'id' | 'createdAt'>) => void;
  onClose: () => void;
  isSubmitting: boolean;
  currentUserProfile: UserProfile | null;
}

const INPUT_STYLE = "block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed";

const validateImageFile = (file: File, t: (key: string, options?: any) => string): { isValid: boolean; error?: string } => {
    const MAX_SIZE_MB = getSettings().imageUploadMaxSizeMb || 10;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!ALLOWED_TYPES.includes(file.type)) {
        return {
            isValid: false,
            error: t('modals.showcase.errorInvalidFileType')
        };
    }

    if (file.size > MAX_SIZE_BYTES) {
        return {
            isValid: false,
            error: t('modals.showcase.errorFileSize', { size: MAX_SIZE_MB })
        };
    }

    return { isValid: true };
};


const PostForm: React.FC<PostFormProps> = ({ initialData, categories, users, onSubmit, onClose, isSubmitting, currentUserProfile }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [authorId, setAuthorId] = useState<string>('');
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [status, setStatus] = useState<'published' | 'pending' | 'private' | 'draft'>('published');
  const [postMeta, setPostMeta] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const { t } = useLanguage();
  const { isAdmin, isPro } = useAuth();
  
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<any>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploadMethodOverride, setUploadMethodOverride] = useState<UploadMethod | undefined>();
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const uploadDropdownRef = useRef<HTMLDivElement>(null);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);

  const sortedCategories = useMemo(() => {
    const normalizedCats = categories.map(c => ({
        ...c,
        id: String(c.id),
        // parentId is string type
        parentId: (c.parentId === null || c.parentId === undefined || c.parentId === '0' || c.parentId === '') ? null : String(c.parentId)
    }));

    const childrenMap = new Map<string | null, typeof normalizedCats>();
    normalizedCats.forEach(c => {
        if (!childrenMap.has(c.parentId)) {
            childrenMap.set(c.parentId, []);
        }
        childrenMap.get(c.parentId)!.push(c);
    });

    const result: (Category & { depth: number })[] = [];

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
      setContent(initialData.content || '');
      setImageUrl(initialData.imageUrl || '');
      setCategoryIds(initialData.categoryIds || []);
      setTagsInput(initialData.tags?.join(', ') || '');
      setAuthorId(initialData.authorId || '');
      setCommentsEnabled(initialData.commentsEnabled ?? true);
      setStatus(initialData.status || 'published');
      setPostMeta(JSON.stringify(initialData.post_meta || {}, null, 2));
    } else {
        // For new posts, default to the current user
        setAuthorId(currentUserProfile?.uid || '');
        setStatus(isAdmin ? 'published' : 'draft');
    }
  }, [initialData, currentUserProfile, isAdmin]);

    useEffect(() => {
        if (quillInstanceRef.current) {
            const editorContent = quillInstanceRef.current.root.innerHTML;
            if (content !== editorContent) {
                quillInstanceRef.current.clipboard.dangerouslyPasteHTML(content);
            }
        }
    }, [content]);

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
    if (!editorContainerRef.current || quillInstanceRef.current) {
        return;
    }

    const initializeEditor = () => {
        if (!editorContainerRef.current) return;
        const editorEl = document.createElement('div');
        editorContainerRef.current.appendChild(editorEl);
        
        const quill = new window.Quill(editorEl, {
          theme: 'snow',
          modules: {
            toolbar: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike', 'blockquote'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              ['link', 'image', 'video'],
              ['clean']
            ],
          },
          placeholder: 'Start writing your post content here...',
        });
        quillInstanceRef.current = quill;

        const initialContent = initialData?.content || '';
        if (initialContent) {
            quill.clipboard.dangerouslyPasteHTML(initialContent);
        }
        
        quill.on('text-change', (delta: any, oldDelta: any, source: string) => {
          if (source === 'user') {
            setContent(quill.root.innerHTML);
          }
        });
    };

    const loadAndInit = async () => {
        if (!window.Quill) {
            if (!window.quillLoadingPromise) {
                window.quillLoadingPromise = Promise.all([
                    new Promise<void>((resolve, reject) => {
                        if (document.querySelector('link[href="https://cdn.quilljs.com/1.3.7/quill.snow.css"]')) {
                            resolve();
                            return;
                        }
                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = 'https://cdn.quilljs.com/1.3.7/quill.snow.css';
                        link.onload = () => resolve();
                        link.onerror = () => reject(new Error('Failed to load Quill CSS'));
                        document.head.appendChild(link);
                    }),
                    new Promise<void>((resolve, reject) => {
                        if (document.querySelector('script[src="https://cdn.quilljs.com/1.3.7/quill.js"]')) {
                            resolve();
                            return;
                        }
                        const script = document.createElement('script');
                        script.src = 'https://cdn.quilljs.com/1.3.7/quill.js';
                        script.onload = () => resolve();
                        script.onerror = () => reject(new Error('Failed to load Quill JS'));
                        document.body.appendChild(script);
                    })
                ]).then(() => {});
            }
            try {
                await window.quillLoadingPromise;
                initializeEditor();
            } catch (error) {
                console.error("Failed to load Quill assets", error);
            }
        } else {
            initializeEditor();
        }
    };

    loadAndInit();

    return () => {
        quillInstanceRef.current = null;
        if (editorContainerRef.current) {
            editorContainerRef.current.innerHTML = '';
        }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(event.target as Node)) {
            setIsUploadDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const uploadOptions = useMemo(() => {
    return getUploadMethodsForRole('image', { isAdmin, isPro });
  }, [isAdmin, isPro]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isUploading) return;
    
    let parsedMeta: Record<string, any> | undefined;
    try {
        if (postMeta.trim()) {
            parsedMeta = JSON.parse(postMeta);
        }
    } catch (e) {
        setError('Post Meta is not valid JSON.');
        return;
    }

    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(Boolean);
    const selectedUser = users.find(u => u.uid === authorId);
    
    if (initialData) {
      const updatedPost: Post = {
        ...initialData,
        title, content, imageUrl, categoryIds, tags, 
        authorId: selectedUser?.uid,
        authorName: selectedUser?.username,
        commentsEnabled, status, post_meta: parsedMeta,
      };
      onSubmit(updatedPost);
    } else {
      const newPost: Omit<Post, 'id' | 'createdAt'> = {
        title, content, imageUrl, categoryIds, tags, 
        authorId: selectedUser?.uid,
        authorName: selectedUser?.username,
        commentsEnabled, status, post_meta: parsedMeta,
      };
      onSubmit(newPost);
    }
  };

  const handleCategoryChange = (id: string) => {
    setCategoryIds(prev => {
        const isChecked = prev.includes(id);
        if (isChecked) {
            // Removing: just remove the ID
            return prev.filter(catId => catId !== id);
        } else {
            // Adding: Add ID and all its ancestors
            const idsToAdd = new Set(prev);
            idsToAdd.add(id);
            
            let currentId = id;
            let safetyCounter = 0;
            
            while(currentId && safetyCounter < 100) {
                const currentCategory = categories.find(c => String(c.id) === String(currentId));
                if (currentCategory && currentCategory.parentId && currentCategory.parentId !== '0') {
                    const parentIdStr = String(currentCategory.parentId);
                    idsToAdd.add(parentIdStr);
                    currentId = parentIdStr;
                } else {
                    break;
                }
                safetyCounter++;
            }
            return Array.from(idsToAdd);
        }
    });
  };

  const handleUpload = async (file: File, method?: UploadMethod) => {
    setIsUploading(true);
    startProgressSimulation();
    setError('');
    try {
        const { imageUrl: url } = await uploadImage(file, method, { isPro, isAdmin });
        setImageUrl(url);
        completeProgress();
    } catch(err: any) {
        setError(err.message || "Failed to upload file.");
        resetProgress();
    } finally {
        setIsUploading(false);
        setTimeout(resetProgress, 500);
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    setIsCropModalOpen(false);
    setCropImageSrc(null);
    await handleUpload(croppedFile, uploadMethodOverride);
  };

  const processFile = (file: File | null) => {
    if (!file) return;

    const validation = validateImageFile(file, t);
    if (!validation.isValid) {
        setError(validation.error || 'Invalid file.');
        return;
    }
    setError('');

    const reader = new FileReader();
    reader.onload = () => {
        setCropImageSrc(reader.result as string);
        setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFile(e.target.files?.[0] || null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
        setIsDragging(true);
    } else if (e.type === 'dragleave') {
        setIsDragging(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      processFile(e.dataTransfer.files?.[0] || null);
  };

  const handleUploadClick = (method?: UploadMethod) => {
    setUploadMethodOverride(method);
    fileInputRef.current?.click();
  };

  return (
    <>
      {isCropModalOpen && cropImageSrc && (
          <ImageCropModal
              imageSrc={cropImageSrc}
              onClose={() => {
                  setIsCropModalOpen(false);
                  setCropImageSrc(null);
              }}
              onComplete={handleCropComplete}
              aspect={undefined}
          />
      )}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full relative space-y-4">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{initialData ? t('admin.postForm.editTitle') : t('admin.postForm.addTitle')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-red-500 text-sm">{error}</p>}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                      <div>
                          <label htmlFor="post-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.titleLabel')}</label>
                          <input id="post-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className={`mt-1 ${INPUT_STYLE}`} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.postForm.contentLabel')}</label>
                          <div className="mt-1 h-fit rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500">
                              <div ref={editorContainerRef}></div>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.postForm.postMetaLabel')}</label>
                          <textarea
                              value={postMeta}
                              onChange={e => setPostMeta(e.target.value)}
                              rows={5}
                              placeholder={t('admin.postForm.postMetaPlaceholder')}
                              className={`mt-1 font-mono text-xs ${INPUT_STYLE}`}
                          />
                      </div>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.imageUrl')}</label>
                          {imageUrl && <img src={imageUrl} alt="Preview" className="aspect-video w-full object-cover rounded-md my-2 border border-gray-300 dark:border-gray-600" />}
                          <div 
                              className={`mt-1 p-4 border-2 ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-gray-300 dark:border-gray-600'} border-dashed rounded-md transition-colors`}
                              onDragEnter={handleDragEvents} onDragOver={handleDragEvents} onDragLeave={handleDragEvents} onDrop={handleDrop}
                          >
                              <div className="flex items-center gap-2">
                                  <input id="image-url" type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} required className={`flex-grow ${INPUT_STYLE}`} placeholder={t('admin.promptForm.imageUrlPlaceholder')} />
                                  <div ref={uploadDropdownRef} className="relative inline-block text-left flex-shrink-0">
                                      <div className="flex rounded-md shadow-sm">
                                          <button type="button" onClick={() => handleUploadClick()} disabled={isUploading} className="relative inline-flex items-center justify-center min-w-[80px] space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 rounded-l-md">
                                              {isUploading ? <CircularProgress progress={uploadProgress} size={20} strokeWidth={3} /> : <span>{t('admin.settings.upload')}</span>}
                                          </button>
                                          <button type="button" onClick={() => setIsUploadDropdownOpen(prev => !prev)} disabled={isUploading} className="-ml-px relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-500">
                                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                          </button>
                                      </div>
                                      {isUploadDropdownOpen && (
                                          <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
                                              <div className="py-1">
                                                  {uploadOptions.map(method => (
                                                      <button key={method} type="button" onClick={() => { handleUploadClick(method); setIsUploadDropdownOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 capitalize">
                                                          {method === 'base64' ? t('admin.settings.base64') : method === 'imgbb' ? t('admin.settings.imgbb') : method === 'cloudinary' ? t('admin.settings.cloudinary') : method === 'tumblr' ? 'Tumblr' : 'Server'}
                                                      </button>
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                                  <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" accept="image/*"/>
                              </div>
                              <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">{t('modals.showcase.dragDrop')}</p>
                          </div>
                      </div>
                      <div>
                          <label htmlFor="post-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.status')}</label>
                          <select id="post-status" value={status} onChange={e => setStatus(e.target.value as any)} className={`mt-1 ${INPUT_STYLE}`}>
                              <option value="published">Published</option>
                              <option value="pending">Pending</option>
                              { (isPro || isAdmin) && <option value="private">Private</option> }
                              <option value="draft">Draft</option>
                          </select>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <span className="flex-grow flex flex-col">
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('admin.promptForm.commentsEnabled')}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{t('admin.promptForm.commentsEnabledHint')}</span>
                          </span>
                          <label htmlFor="comments-enabled-post-toggle" className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" id="comments-enabled-post-toggle" className="sr-only peer" checked={commentsEnabled} onChange={e => setCommentsEnabled(e.target.checked)} />
                              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.categories')}</label>
                          <div className={`mt-2 space-y-2 border border-gray-300 dark:border-gray-600 rounded-md p-2 ${isCategoriesExpanded ? '' : 'max-h-32 overflow-y-auto'}`}>
                              {sortedCategories.map(c => (
                                  <div key={c.id} className="flex items-center" style={{ paddingLeft: `${c.depth * 30}px` }}>
                                    <input 
                                        id={`cat-${c.id}`} 
                                        type="checkbox" 
                                        checked={categoryIds.includes(c.id)} 
                                        onChange={() => handleCategoryChange(c.id)} 
                                        className="h-4 w-4 rounded" 
                                    />
                                    <label htmlFor={`cat-${c.id}`} className="ml-2 text-sm">
                                         { c.depth > 0 && <span className="text-gray-400 mr-1">↳</span>}
                                        {c.name}
                                    </label>
                                  </div>
                              ))}
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
                      <div>
                          <label htmlFor="post-tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.tags')}</label>
                          <input type="text" id="post-tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder={t('admin.promptForm.tagsPlaceholder')} className={`mt-1 ${INPUT_STYLE}`} autoComplete="tags" />
                      </div>
                      {isAdmin && (
                          <div>
                              <label htmlFor="post-author" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.author')}</label>
                              <select id="post-author" value={authorId} onChange={e => setAuthorId(e.target.value)} className={`mt-1 ${INPUT_STYLE}`}>
                                  <option value="">{t('admin.promptForm.authorAnonymousOption')}</option>
                                  {users.map(u => <option key={u.uid} value={u.uid}>{u.username}</option>)}
                              </select>
                          </div>
                      )}
                  </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button type="button" onClick={onClose} className="py-2 px-4 border rounded-md text-sm font-medium">{t('common.cancel')}</button>
                  <button type="submit" disabled={isSubmitting || isUploading} className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 w-36 flex justify-center">
                      {isSubmitting ? <Spinner size="sm" /> : (initialData ? t('admin.postForm.saveChanges') : t('admin.postForm.createPost'))}
                  </button>
              </div>
          </form>
      </div>
    </>
  );
};

export default PostForm;
