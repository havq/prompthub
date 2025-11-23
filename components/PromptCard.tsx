
import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { PromptCardProps } from './PromptCard/types';
import PromptCardSkeleton from './PromptCardSkeleton';
import { transformCloudinaryUrl } from '../services/cloudinaryUtils';
import ReferenceImageViewer from './PromptCard/ReferenceImageViewer';
import CardMedia from './PromptCard/CardMedia';
import CardOverlays from './PromptCard/CardOverlays';
import CardContent from './PromptCard/CardContent';
import ShareButton from './ShareButton';
import { useLanguage } from '../context/LanguageContext';
import { getImageUrls } from './PromptCard/utils';

const PromptCard: React.FC<PromptCardProps> = (props) => {
    const {
        prompt,
        isFavorite,
        onToggleFavorite,
        onFindSimilar,
        onClick,
        viewMode = 'grid',
        categories,
    } = props;
    
    const { t } = useLanguage();
    const [isReferenceImageOpen, setIsReferenceImageOpen] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const [isIntersecting, setIsIntersecting] = useState(false);
    const [isMediaReady, setIsMediaReady] = useState(false);
    const [mediaError, setMediaError] = useState(false);

    const imageUrls = useMemo(() => getImageUrls(prompt.imageUrl), [prompt.imageUrl]);
    const firstImageUrl = imageUrls[0] || '';
    const optimizedImageUrl = transformCloudinaryUrl(firstImageUrl, 'w_400,c_fill');

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsIntersecting(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' }
        );

        const currentRef = cardRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, []);

    useEffect(() => {
        if (isIntersecting) {
            if (prompt.videoUrl) {
                setIsMediaReady(true);
            } else if (firstImageUrl) {
                const img = new Image();
                img.src = optimizedImageUrl;
                img.onload = () => setIsMediaReady(true);
                img.onerror = () => setMediaError(true);
            } else {
                setMediaError(true);
            }
        }
    }, [isIntersecting, optimizedImageUrl, prompt.videoUrl, firstImageUrl]);

    if (!isMediaReady && !mediaError) {
        return <div ref={cardRef}><PromptCardSkeleton viewMode={viewMode} /></div>;
    }

    if (viewMode === 'compact') {
        const promptCategories = (prompt.categoryIds || [])
            .map((id) => categories.find((f) => f.id === id))
            .filter((f) => f !== undefined);

        return (
            <>
                <ReferenceImageViewer isOpen={isReferenceImageOpen} imageUrl={prompt.referenceImageUrl} onClose={() => setIsReferenceImageOpen(false)} />
                <div
                    ref={cardRef}
                    onClick={onClick}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for prompt: ${prompt.title}`}
                    className="relative group overflow-hidden aspect-squareX aspect-[3/4] bg-gray-200 dark:bg-gray-700 rounded-lg shadow-md transition-all duration-300 hover:shadow-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <CardMedia prompt={prompt} viewMode={viewMode} isMediaReady={isMediaReady} mediaError={mediaError} />
                    
                    {/* Top Left Badges (Remix, Private) */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-20 pointer-events-none">
                        {prompt.remixedFrom && (
                             <div className="bg-purple-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm flex items-center gap-1" title={t('promptCard.remix')}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /><path d="M3 10a7 7 0 0111.94-4.95l1.103-1.104a1 1 0 011.414 1.414l-1.104 1.103A7 7 0 113 10zm11.495-2.553a1 1 0 01-1.414-1.414l1.104-1.103a5 5 0 10-7.072 7.072l-1.103 1.103a1 1 0 01-1.414-1.414l1.103-1.103a5 5 0 007.072-7.072z" /></svg>
                                <span>Remix</span>
                            </div>
                        )}
                         {prompt.isPrivate && (
                            <div className="bg-gray-800/80 text-white p-1 rounded-full backdrop-blur-sm" title="Private">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
                            </div>
                        )}
                    </div>

                    {/* Top Right NSFW Badge */}
                    {prompt.isNSFW && (
                        <div className="absolute top-2 right-2 z-20 pointer-events-none">
                            <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm">NSFW</span>
                        </div>
                    )}

                    {/* Bottom Left Reference Image */}
                    {prompt.referenceImageUrl && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsReferenceImageOpen(true); }}
                            className="absolute bottom-2 left-2 z-20 w-16 h-20 rounded overflow-hidden border border-white/70 shadow-sm hover:border-white transition-all duration-200 hover:scale-110 focus:outline-none pointer-events-auto"
                            title={t('promptCard.referenceImageTooltip')}
                        >
                            <img 
                                src={transformCloudinaryUrl(prompt.referenceImageUrl, 'w_120,h_160,c_fill,g_auto')} 
                                alt="Ref"
                                className="w-full h-full object-cover"
                            />
                        </button>
                    )}

                    {/* Bottom Right Categories Badge */}
                    <div className="absolute bottom-2 right-2 flex flex-wrap justify-end gap-1 z-20 pointer-events-none max-w-[80%]">
                        {promptCategories.slice(0, 1).map(cat => (
                             <span key={cat.id} className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm truncate">
                                {cat.name}
                             </span>
                        ))}
                        {promptCategories.length > 1 && (
                             <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                                +{promptCategories.length - 1}
                             </span>
                        )}
                    </div>

                    {/* Overlay for Compact Mode */}
                    {isMediaReady && !mediaError && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-2 text-white z-30">
                            <div className="flex items-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(prompt); }} className={`p-1.5 rounded-full transition-colors ${isFavorite ? 'bg-red-500/80 text-white' : 'bg-gray-900/60 text-gray-300 hover:bg-red-500/80 hover:text-white'}`} title={isFavorite ? t('promptCard.removeFromFavorites') : t('promptCard.addToFavorites')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>
                                </button>
                                <ShareButton prompt={prompt} className="p-1.5 rounded-full bg-gray-900/60 text-gray-300 hover:bg-green-600/80 hover:text-white transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367 2.684z" /></svg>
                                </ShareButton>
                            </div>
                            <h3 className="text-xs font-semibold text-center mt-2 line-clamp-3">{prompt.title}</h3>
                        </div>
                    )}
                </div>
            </>
        );
    }

    if (viewMode === 'list') {
        return (
            <>
                <ReferenceImageViewer isOpen={isReferenceImageOpen} imageUrl={prompt.referenceImageUrl} onClose={() => setIsReferenceImageOpen(false)} />
                <div
                    ref={cardRef}
                    onClick={onClick}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for prompt: ${prompt.title}`}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full"
                >
                    <div className="relative group overflow-hidden flex-shrink-0 w-32 h-32 md:w-40 md:h-40 bg-gray-200 dark:bg-gray-700 rounded-md">
                        <CardMedia prompt={prompt} viewMode={viewMode} isMediaReady={isMediaReady} mediaError={mediaError} />

                        {/* Top Left Badges (Remix, Private) */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1 z-20 pointer-events-none">
                            {prompt.remixedFrom && (
                                <div className="bg-purple-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm flex items-center gap-1" title={t('promptCard.remix')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /><path d="M3 10a7 7 0 0111.94-4.95l1.103-1.104a1 1 0 011.414 1.414l-1.104 1.103A7 7 0 113 10zm11.495-2.553a1 1 0 01-1.414-1.414l1.104-1.103a5 5 0 10-7.072 7.072l-1.103 1.103a1 1 0 01-1.414-1.414l1.103-1.103a5 5 0 007.072-7.072z" /></svg>
                                </div>
                            )}
                            {prompt.isPrivate && (
                                <div className="bg-gray-800/80 text-white p-1 rounded-full backdrop-blur-sm" title="Private">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
                                </div>
                            )}
                        </div>


                        {prompt.isNSFW && (
                            <div className="absolute top-2 right-2 z-20 pointer-events-none">
                                <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm">18+</span>
                            </div>
                        )}

                         {/* Simplified Overlay for List Mode */}
                        {isMediaReady && !mediaError && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-2 z-30">
                                <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(prompt); }} className={`p-2 rounded-full transition-colors ${isFavorite ? 'bg-red-500/80 text-white' : 'bg-gray-900/60 text-gray-300 hover:bg-red-500/80 hover:text-white'}`} title={isFavorite ? t('promptCard.removeFromFavorites') : t('promptCard.addToFavorites')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg></button>
                                <button onClick={(e) => { e.stopPropagation(); onFindSimilar(prompt); }} className="p-2 rounded-full bg-gray-900/60 text-gray-300 hover:bg-indigo-600/80 hover:text-white transition-colors" title={t('promptCard.findSimilar')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
                            </div>
                        )}
                    </div>
                    <CardContent {...props} />
                </div>
            </>
        );
    }

    // Default: Grid View
    return (
        <>
            <ReferenceImageViewer isOpen={isReferenceImageOpen} imageUrl={prompt.referenceImageUrl} onClose={() => setIsReferenceImageOpen(false)} />
            <div
                ref={cardRef}
                onClick={onClick}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
                role="button"
                tabIndex={0}
                aria-label={`View details for prompt: ${prompt.title}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col h-full border border-gray-200 dark:border-gray-700 text-left w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                <div className="relative group overflow-hidden aspect-squareX aspect-[3/4] rounded-lg bg-gray-200 dark:bg-gray-700">
                    <CardMedia prompt={prompt} viewMode={viewMode} isMediaReady={isMediaReady} mediaError={mediaError} />
                    <CardOverlays
                        {...props}
                        isMediaReady={isMediaReady}
                        mediaError={mediaError}
                        onOpenReferenceImage={() => setIsReferenceImageOpen(true)}
                    />
                </div>
                <CardContent {...props} />
            </div>
        </>
    );
};

export default memo(PromptCard);
