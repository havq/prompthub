import React, { useState, useEffect, useRef } from 'react';
import { StaticPage } from '../types';
import Spinner from './Spinner';
import { useLanguage } from '../context/LanguageContext';

declare global {
    interface Window {
        Quill: any;
        quillLoadingPromise: Promise<void> | null;
    }
}

interface PageFormProps {
  initialData: StaticPage | null;
  onSubmit: (data: StaticPage | Omit<StaticPage, 'id' | 'createdAt'>) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

const INPUT_STYLE = "block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500";

const PageForm: React.FC<PageFormProps> = ({ initialData, onSubmit, onClose, isSubmitting }) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<any>(null);

  const { t } = useLanguage();

  // This effect synchronizes the form state with the initialData prop.
  // It also updates the editor content if it's already initialized.
  useEffect(() => {
    setTitle(initialData?.title || '');
    setSlug(initialData?.slug || '');
    const newContent = initialData?.content || '';
    setContent(newContent);
    
    if (quillInstanceRef.current) {
        const editorContent = quillInstanceRef.current.root.innerHTML;
        // Avoid recursive updates by checking if content is different
        if (newContent !== editorContent) {
            quillInstanceRef.current.clipboard.dangerouslyPasteHTML(newContent);
        }
    }
  }, [initialData]);
  
  const generateSlug = (str: string): string => {
    str = str.toLowerCase();
    
    // Convert Vietnamese characters to their non-diacritic counterparts
    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Special case for 'đ'
    str = str.replace(/đ/g, 'd');
    
    // Replace spaces and non-word characters with a hyphen
    str = str.replace(/[^a-z0-9\s-]/g, '') // remove invalid chars
             .replace(/\s+/g, '-')       // collapse whitespace to -
             .replace(/-+/g, '-');        // collapse dashes

    // Trim hyphens from start and end
    str = str.replace(/^-+|-+$/g, '');
    
    return str;
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      const currentSlug = slug.trim();
      // Auto-generate slug only if slug is empty or was auto-generated from the previous title
      if (!currentSlug || currentSlug === generateSlug(title)) {
          setSlug(generateSlug(newTitle));
      }
  };

  // This effect initializes the Quill editor instance once.
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
          placeholder: 'Start writing your page content here...',
        });
        quillInstanceRef.current = quill;
        
        // Set initial content directly from props after initialization.
        const initialContentFromProp = initialData?.content || '';
        if (initialContentFromProp) {
            quill.clipboard.dangerouslyPasteHTML(initialContentFromProp);
        }
        
        // Listen for changes and update the state
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
                ]).then(() => {}); // Resolve with void
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

    // Cleanup function
    return () => {
      quillInstanceRef.current = null;
      if (editorContainerRef.current) {
        editorContainerRef.current.innerHTML = '';
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    const pageData = {
      title,
      slug,
      content,
    };

    if (initialData) {
      onSubmit({ ...initialData, ...pageData });
    } else {
      onSubmit(pageData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-3xl relative flex flex-col max-h-[95vh]">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex-shrink-0">{initialData ? t('admin.pageForm.editTitle') : t('admin.pageForm.addTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4 flex-grow flex flex-col overflow-hidden">
                <div className='flex-shrink-0'>
                    <label htmlFor="page-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.pageForm.titleLabel')}</label>
                    <input id="page-title" type="text" value={title} onChange={handleTitleChange} required className={`mt-1 ${INPUT_STYLE}`} />
                </div>
                <div className='flex-shrink-0'>
                    <label htmlFor="page-slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.pageForm.slugLabel')}</label>
                    <input id="page-slug" type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required className={`mt-1 ${INPUT_STYLE}`} />
                </div>
                <div className='flex-grow overflow-y-auto'>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.pageForm.contentLabel')}</label>
                    <div ref={editorContainerRef} className="mt-1"></div>
                </div>

                <div className="flex justify-end space-x-4 pt-4 flex-shrink-0">
                    <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">{t('common.cancel')}</button>
                    <button type="submit" disabled={isSubmitting} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 w-36 flex justify-center">
                        {isSubmitting ? <Spinner size="sm" /> : t('common.save')}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default PageForm;