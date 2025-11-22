import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { uploadImage } from '../services/imageUploadService';
import Spinner from './Spinner';
import CircularProgress from './CircularProgress';
import { Prompt } from '../types';
import ImageCropModal from './ImageCropModal';
import { getSettings } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';

interface ShowcaseUploadModalProps {
  prompt: Prompt;
  onClose: () => void;
  onSubmit: (imageUrl: string) => Promise<void>;
}

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

const ShowcaseUploadModal: React.FC<ShowcaseUploadModalProps> = ({ prompt, onClose, onSubmit }) => {
  const { t } = useLanguage();
  const { isPro, isAdmin } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

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

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
      const validation = validateImageFile(selectedFile, t);
      if (!validation.isValid) {
          setError(validation.error || 'Invalid file.');
          return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImageSrc(reader.result as string);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(selectedFile);
      setError('');

    } else if (selectedFile) {
      setError(t('modals.showcase.errorInvalidFile'));
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
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileChange(e.dataTransfer.files[0]);
      }
  };

  const handleCropAndSubmit = async (finalFile: File) => {
    if (!finalFile) {
      setError(t('modals.showcase.errorNoFile'));
      return;
    }

    setIsCropModalOpen(false);
    setCropImageSrc(null);
    setIsUploading(true);
    startProgressSimulation();
    setError('');
    
    try {
        const result = await uploadImage(finalFile, undefined, { isPro, isAdmin });
        completeProgress();
        
        // Add small delay to show 100%
        setTimeout(async () => {
            setIsUploading(false);
            setIsSubmitting(true);
            await onSubmit(result.imageUrl);
            onClose();
        }, 500);

    } catch(err: any) {
        setError(err.message || t('modals.showcase.errorUpload'));
        setIsUploading(false);
        resetProgress();
    }
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
              onComplete={handleCropAndSubmit}
              aspect={undefined} // Free aspect ratio for showcase
          />
      )}
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4" onClick={onClose} aria-modal="true" role="dialog">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white" disabled={isSubmitting || isUploading}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('modals.showcase.title')}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('modals.showcase.subtitle')}</p>
              
              {error && <p className="text-red-500 dark:text-red-400 text-sm bg-red-100 dark:bg-red-900/50 p-2 rounded-md">{error}</p>}
              
              <div 
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-gray-300 dark:border-gray-600'} border-dashed rounded-md transition-colors`}
                onDragEnter={handleDragEvents}
                onDragOver={handleDragEvents}
                onDragLeave={handleDragEvents}
                onDrop={handleDrop}
              >
                <div className="space-y-1 text-center">
                    {(isUploading || isSubmitting) ? (
                      <div className="flex flex-col items-center justify-center h-24">
                        {isUploading ? <CircularProgress progress={uploadProgress} size={50} /> : <Spinner />}
                      </div>
                    ) : (
                      <>
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 4v.01M28 8l-6-6-6 6M28 8v12a4 4 0 01-4 4H12a4 4 0 01-4-4V12m24 12l-6-6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                          <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                            <span>{t('modals.showcase.uploadFile')}</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" ref={fileInputRef} onChange={e => handleFileChange(e.target.files ? e.target.files[0] : null)} accept="image/*" />
                          </label>
                          <p className="pl-1">{t('modals.showcase.dragDrop')}</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-500">{t('modals.showcase.fileTypes')}</p>
                      </>
                    )}
                </div>
              </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShowcaseUploadModal;