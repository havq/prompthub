
import React, { useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Prompt } from '../../utils/types';
import { useLanguage } from '../../context/LanguageContext';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import Spinner from '../Spinner';
import { Link, useNavigate } from 'react-router-dom';

interface MediaItem {
    type: 'image' | 'video' | 'youtube';
    url: string;
    id: string;
}

interface MediaViewerProps {
    mediaItems: MediaItem[];
    currentMediaIndex: number;
    setCurrentMediaIndex: (index: number) => void;
    goToPrev: () => void;
    goToNext: () => void;
    prompt: Prompt;
    isMediaLoaded: boolean;
    mediaError: boolean;
    canManage: boolean;
    onEdit: (prompt: Prompt) => void;
    onDelete: (prompt: Prompt) => void;
    onReferenceImageClick: () => void;
    containerRef: React.RefObject<HTMLDivElement>;
}

const MediaViewer: React.FC<MediaViewerProps> = ({
    mediaItems,
    currentMediaIndex,
    setCurrentMediaIndex,
    goToPrev,
    goToNext,
    prompt,
    isMediaLoaded,
    mediaError,
    canManage,
    onEdit,
    onDelete,
    onReferenceImageClick,
    containerRef
}) => {
    const { t } = useLanguage();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isNSFWConfirmed, setIsNSFWConfirmed] = useState(false);

    const showNSFWOverlay = prompt.isNSFW && !isNSFWConfirmed;
    const navigate = useNavigate();
    return (
        <div ref={containerRef} className="group flex-shrink-0 w-full md:w-1/2 lg:w-2/3 aspect-square md:aspect-auto md:h-full bg-gray-100 dark:bg-black flex items-center justify-center relative rounded-t-lg md:rounded-l-lg md:rounded-t-none overflow-hidden transition-[height] duration-150 ease-out">
            {showNSFWOverlay && (
                <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-red-600 rounded-full p-3 mb-4 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{t('promptDetail.nsfwWarningTitle')}</h3>
                    <p className="text-gray-300 mb-6 max-w-md">{t('promptDetail.nsfwWarningMessage')}</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <button 
                            onClick={() => navigate('/')}
                            className="bg-gray-800 text-white font-medium py-2 px-6 rounded-full hover:bg-gray-700 transition-colors shadow-lg border border-gray-700"
                        >
                            {t('common.backToHome')}
                        </button>
                        <button 
                            onClick={() => setIsNSFWConfirmed(true)}
                            className="bg-white text-black font-bold py-2 px-8 rounded-full hover:bg-gray-200 transition-colors shadow-lg transform hover:scale-105 active:scale-95"
                        >
                            {t('promptDetail.confirmAge')}
                        </button>
                    </div>

                </div>
            )}

            {isMediaLoaded && !mediaError ? (
            <TransformWrapper centerOnInit={true} key={mediaItems[currentMediaIndex]?.id || currentMediaIndex} disabled={showNSFWOverlay}>
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        {mediaItems.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); goToPrev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-opacity opacity-100 lg:opacity-0 lg:group-hover:opacity-100" title="Previous">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); goToNext(); }} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-opacity opacity-100 lg:opacity-0 lg:group-hover:opacity-100" title="Next">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                                <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center items-center gap-2">
                                    {mediaItems.map((_, index) => (
                                        <button key={index} onClick={(e) => {e.stopPropagation(); setCurrentMediaIndex(index);}} className={`w-2 h-2 rounded-full transition-colors ${currentMediaIndex === index ? 'bg-white' : 'bg-white/50 hover:bg-white/75'}`}></button>
                                    ))}
                                </div>
                            </>
                        )}
                        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); zoomIn(); }} className="p-2 bg-black/30 text-white rounded-full hover:bg-black/50" title="Zoom In"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3h-6" /></svg></button>
                            <button onClick={(e) => { e.stopPropagation(); zoomOut(); }} className="p-2 bg-black/30 text-white rounded-full hover:bg-black/50" title="Zoom Out"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg></button>
                            <button onClick={(e) => { e.stopPropagation(); resetTransform(); }} className="p-2 bg-black/30 text-white rounded-full hover:bg-black/50" title="Reset View"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg></button>
                        </div>
                        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {(() => {
                                const currentMedia = mediaItems[currentMediaIndex];
                                if (!currentMedia) return null;

                                switch (currentMedia.type) {
                                    case 'youtube':
                                        const ytSrc = showNSFWOverlay ? currentMedia.url.replace('autoplay=1', 'autoplay=0') : currentMedia.url;
                                        return <iframe src={ytSrc} className="w-full h-full object-contain" frameBorder="0" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen title={prompt.title}></iframe>;
                                    case 'video':
                                        return <video ref={videoRef} src={currentMedia.url} controls autoPlay={!showNSFWOverlay} muted loop playsInline className="max-w-full max-h-full object-contain" />;
                                    case 'image':
                                        return <img src={transformCloudinaryUrl(currentMedia.url, 'w_800')} alt="Prompt visual" className={`max-w-full max-h-full object-contain cursor-grab ${showNSFWOverlay ? 'filter blur-2xl scale-110' : ''}`} />;
                                    default:
                                        return null;
                                }
                            })()}
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>
            ) : mediaError ? (
                <div className="text-gray-400 dark:text-gray-500 flex flex-col items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><p>Image not available</p></div>
            ) : (
                <Spinner size="lg" />
            )}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                {canManage && (<><button onClick={() => onEdit(prompt)} className="p-1.5 bg-gray-900/60 text-white rounded-full hover:bg-blue-600/80 backdrop-blur-sm" title={t('common.edit')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button><button onClick={() => onDelete(prompt)} className="p-1.5 bg-gray-900/60 text-white rounded-full hover:bg-red-600/80 backdrop-blur-sm" title={t('common.delete')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button></>)}
            </div>
            {prompt.referenceImageUrl && !showNSFWOverlay && (
                <button
                    onClick={(e) => { e.stopPropagation(); onReferenceImageClick(); }}
                    className="absolute bottom-4 left-4 z-10 w-20 h-28 rounded-md overflow-hidden border-2 border-white/50 shadow-lg group-hover:scale-105 group-hover:border-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    title={t('promptCard.referenceImageTooltip')}
                >
                    <img
                        src={transformCloudinaryUrl(prompt.referenceImageUrl, 'w_100,h_150,c_fill,g_auto')}
                        alt={t('promptCard.referenceImageTooltip')}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors"></div>
                </button>
            )}
        </div>
    );
};

export default MediaViewer;
