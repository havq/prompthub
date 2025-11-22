
import React, { useRef, useState, useEffect } from 'react';
import { UploadMethod } from '../../types';
import Spinner from '../Spinner';
import CircularProgress from '../CircularProgress';
import { Link } from 'react-router-dom';

interface PromptMediaUploadProps {
    imageUrls: string[];
    setImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
    videoUrl: string;
    setVideoUrl: (val: string) => void;
    referenceImageUrl: string;
    setReferenceImageUrl: (val: string) => void;
    requiresUserImage: boolean;
    setRequiresUserImage: (val: boolean) => void;
    imageDimensions: {width: number, height: number} | null;
    rotation: number;
    setRotation: (val: number) => void;
    isUploading: boolean;
    isUploadingVideo: boolean;
    isUploadingReference: boolean;
    uploadProgress: number; // Added progress prop
    uploadOptions: UploadMethod[];
    videoUploadOptions: UploadMethod[];
    isAdmin: boolean;
    isPro: boolean;
    INPUT_STYLE: string;
    t: (key: string) => string;
    handleUploadClick: (method?: UploadMethod) => void;
    handleImageFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleImageDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    handleDragStart: (index: number) => void;
    handleDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    handleDragEvents: (e: React.DragEvent<HTMLDivElement>) => void;
    isDragging: boolean;
    setDraggedIndex: (index: number | null) => void;
    draggedIndex: number | null;
    handleRemoveImage: (index: number) => void;
    addUrlFromInput: () => void;
    urlInputRef: React.RefObject<HTMLInputElement>;
    fileInputRef: React.RefObject<HTMLInputElement>;
    videoFileInputRef: React.RefObject<HTMLInputElement>;
    referenceFileInputRef: React.RefObject<HTMLInputElement>;
    handleVideoUploadClick: (method?: UploadMethod) => void;
    handleVideoFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleReferenceUploadClick: (method?: UploadMethod) => void;
    handleReferenceFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isRefDragging: boolean;
    handleRefDragEvents: (e: React.DragEvent<HTMLDivElement>) => void;
    handleRefDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

const PromptMediaUpload: React.FC<PromptMediaUploadProps> = (props) => {
    const { t } = props;
    const [isMainUploadDropdownOpen, setIsMainUploadDropdownOpen] = useState(false);
    const mainUploadDropdownRef = useRef<HTMLDivElement>(null);
    const [isVideoUploadDropdownOpen, setIsVideoUploadDropdownOpen] = useState(false);
    const videoUploadDropdownRef = useRef<HTMLDivElement>(null);
    const [isRefUploadDropdownOpen, setIsRefUploadDropdownOpen] = useState(false);
    const refUploadDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (mainUploadDropdownRef.current && !mainUploadDropdownRef.current.contains(event.target as Node)) setIsMainUploadDropdownOpen(false);
          if (refUploadDropdownRef.current && !refUploadDropdownRef.current.contains(event.target as Node)) setIsRefUploadDropdownOpen(false);
          if (videoUploadDropdownRef.current && !videoUploadDropdownRef.current.contains(event.target as Node)) setIsVideoUploadDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.imageUrl')}</label>
                {props.imageUrls.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                        {props.imageUrls.map((url, index) => {
                            const isBeingDragged = props.draggedIndex === index;
                            return (
                                <div 
                                    key={`${url}-${index}`}
                                    className={`relative flex-shrink-0 w-24 h-24 group transition-opacity ${isBeingDragged ? 'opacity-30' : ''} ${props.draggedIndex !== null ? 'cursor-grabbing' : 'cursor-grab'}`}
                                    draggable
                                    onDragStart={() => props.handleDragStart(index)}
                                    onDragOver={(e) => props.handleDragOver(e, index)}
                                    onDragEnd={() => props.setDraggedIndex(null)}
                                >
                                    <img 
                                        src={url} 
                                        alt={`Preview ${index + 1}`} 
                                        className="w-full h-full object-cover rounded-md border-2 border-transparent group-hover:border-indigo-500" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => props.handleRemoveImage(index)}
                                        className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                                        aria-label={`Remove image ${index + 1}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
                <div 
                    className={`mt-1 p-4 border-2 ${props.isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-gray-300 dark:border-gray-600'} border-dashed rounded-md transition-colors`}
                    onDragEnter={props.handleDragEvents} onDragOver={props.handleDragEvents} onDragLeave={props.handleDragEvents} onDrop={props.handleImageDrop}
                >
                    <div className="flex items-center gap-2">
                        <input
                            ref={props.urlInputRef}
                            type="text"
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); props.addUrlFromInput(); } }}
                            className={`flex-grow ${props.INPUT_STYLE}`}
                            placeholder="Paste an image URL and press Enter"
                        />
                        <div ref={mainUploadDropdownRef} className="relative inline-block text-left flex-shrink-0">
                            <div className="flex rounded-md shadow-sm">
                                <button type="button" onClick={() => props.handleUploadClick()} disabled={props.isUploading || props.isUploadingVideo} className="relative inline-flex items-center justify-center min-w-[80px] space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 rounded-l-md">
                                    {props.isUploading ? <CircularProgress progress={props.uploadProgress} size={20} strokeWidth={3} className="text-orange-600 dark:text-orange-500" /> : <span>{t('admin.settings.upload')}</span>}
                                </button>
                                <button type="button" onClick={() => setIsMainUploadDropdownOpen(prev => !prev)} disabled={props.isUploading || props.isUploadingVideo} className="-ml-px relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-500">
                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                            {isMainUploadDropdownOpen && (
                                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
                                    <div className="py-1">
                                        {props.uploadOptions.map(method => (
                                            <button key={method} type="button" onClick={() => { props.handleUploadClick(method); setIsMainUploadDropdownOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 capitalize">
                                                {method === 'base64' ? t('admin.settings.base64') : method === 'imgbb' ? t('admin.settings.imgbb') : method === 'cloudinary' ? t('admin.settings.cloudinary') : method === 'tumblr' ? 'Tumblr' : 'Server'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <input type="file" multiple ref={props.fileInputRef} onChange={props.handleImageFilesSelected} className="hidden" accept="image/*"/>
                    </div>
                    <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">{t('modals.showcase.dragDrop')}</p>
                </div>
            </div>
            <div>
                <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('submitPromptPage.videoUrl')}</label>
                <div className="mt-1 flex items-center gap-2">
                    <input
                        type="text"
                        id="video-url"
                        value={props.videoUrl}
                        onChange={(e) => props.setVideoUrl(e.target.value)}
                        className={`flex-grow ${props.INPUT_STYLE}`}
                        placeholder="https://example.com/video.mp4 or YouTube URL"
                        disabled={!props.isAdmin && !props.isPro && props.videoUploadOptions.length === 0}
                    />
                    {props.videoUploadOptions.length > 0 ? (
                        <div ref={videoUploadDropdownRef} className="relative inline-block text-left flex-shrink-0">
                            <div className="flex rounded-md shadow-sm">
                                <button type="button" onClick={() => props.handleVideoUploadClick()} disabled={props.isUploading || props.isUploadingVideo || props.isUploadingReference} className="relative inline-flex items-center justify-center min-w-[80px] space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 rounded-l-md">
                                    {props.isUploadingVideo ? <CircularProgress progress={props.uploadProgress} size={20} strokeWidth={3} className="text-red-600 dark:text-red-500" /> : <span>{t('admin.settings.upload')}</span>}
                                </button>
                                <button type="button" onClick={() => setIsVideoUploadDropdownOpen(prev => !prev)} disabled={props.isUploading || props.isUploadingVideo || props.isUploadingReference} className="-ml-px relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-500">
                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                            {isVideoUploadDropdownOpen && (
                                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
                                    <div className="py-1">
                                        {props.videoUploadOptions.map(method => (
                                            <button key={method} type="button" onClick={() => { props.handleVideoUploadClick(method); setIsVideoUploadDropdownOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 capitalize">
                                                {method === 'base64' ? t('admin.settings.base64') : method === 'imgbb' ? t('admin.settings.imgbb') : method === 'cloudinary' ? t('admin.settings.cloudinary') : method === 'tumblr' ? 'Tumblr' : 'Server'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : !props.isAdmin && !props.isPro ? (
                        <Link to="/go-pro" className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap hover:opacity-90 transition-opacity">
                            {t('submitPromptPage.onlyPro')}
                        </Link>
                    ) : null}
                        <input type="file" ref={props.videoFileInputRef} onChange={props.handleVideoFileSelected} className="hidden" accept="video/mp4,video/webm,video/quicktime,video/mov"/>
                </div>
            </div>

            {props.imageUrls.length > 0 && !props.videoUrl && (
                <div>
                    <label htmlFor="image-rotation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('submitPromptPage.imageRotation')}</label>
                    <select
                        id="image-rotation"
                        value={props.rotation}
                        onChange={e => props.setRotation(Number(e.target.value))}
                        className={`mt-1 ${props.INPUT_STYLE}`}
                    >
                        <option value="0">{t('submitPromptPage.noRotation')}</option>
                        <option value="90">{t('submitPromptPage.rotate90')}</option>
                        <option value="-90">{t('submitPromptPage.rotateMinus90')}</option>
                    </select>
                </div>
            )}

            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mt-2">
                <input id="requires-user-image" type="checkbox" checked={props.requiresUserImage} onChange={e => props.setRequiresUserImage(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-400 dark:border-gray-500 bg-gray-200 dark:bg-gray-600 rounded" />
                <label htmlFor="requires-user-image" className="flex-grow flex flex-col cursor-pointer">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Requires User Image</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Check this if the prompt is designed for users to upload their own reference image.</span>
                </label>
            </div>

            {props.requiresUserImage && (
                <div>
                    <label htmlFor="reference-image-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('submitPromptPage.referenceImageUrl')}</label>
                    <div 
                        className={`mt-1 p-4 border-2 ${props.isRefDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-gray-300 dark:border-gray-600'} border-dashed rounded-md transition-colors`}
                        onDragEnter={props.handleRefDragEvents} onDragOver={props.handleRefDragEvents} onDragLeave={props.handleRefDragEvents} onDrop={props.handleRefDrop}
                    >
                        <div className="flex items-center gap-2">
                            <input type="text" id="reference-image-url" value={props.referenceImageUrl} onChange={(e) => props.setReferenceImageUrl(e.target.value)} className={`flex-grow ${props.INPUT_STYLE}`} placeholder="https://..." />
                            <div ref={refUploadDropdownRef} className="relative inline-block text-left flex-shrink-0">
                                <div className="flex rounded-md shadow-sm">
                                    <button type="button" onClick={() => props.handleReferenceUploadClick()} disabled={props.isUploadingReference || props.isUploading || props.isUploadingVideo} className="relative inline-flex items-center justify-center min-w-[80px] space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 rounded-l-md">
                                        {props.isUploadingReference ? <CircularProgress progress={props.uploadProgress} size={20} strokeWidth={3} className="text-red-600 dark:text-red-500" /> : <span>{t('admin.settings.upload')}</span>}
                                    </button>
                                    <button type="button" onClick={() => setIsRefUploadDropdownOpen(prev => !prev)} disabled={props.isUploadingReference || props.isUploading || props.isUploadingVideo} className="-ml-px relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-500">
                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                                {isRefUploadDropdownOpen && (
                                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
                                        <div className="py-1">
                                            {props.uploadOptions.map(method => (
                                                <button key={method} type="button" onClick={() => { props.handleReferenceUploadClick(method); setIsRefUploadDropdownOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 capitalize">
                                                    {method === 'base64' ? t('admin.settings.base64') : method === 'imgbb' ? t('admin.settings.imgbb') : method === 'cloudinary' ? t('admin.settings.cloudinary') : method === 'tumblr' ? 'Tumblr' : 'Server'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={props.referenceFileInputRef} onChange={props.handleReferenceFileChange} className="hidden" accept="image/*"/>
                        </div>
                        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">{t('modals.showcase.dragDrop')}</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default PromptMediaUpload;
