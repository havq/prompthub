import React, { useRef, useMemo } from 'react';
import { Prompt } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { getRotationClass, getImageUrls, parseYouTubeUrl } from './utils';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';

interface CardMediaProps {
    prompt: Prompt;
    viewMode: 'grid' | 'list' | 'compact';
    isMediaReady: boolean;
    mediaError: boolean;
}

const CardMedia: React.FC<CardMediaProps> = ({ prompt, viewMode, isMediaReady, mediaError }) => {
    const { t } = useLanguage();
    const videoRef = useRef<HTMLVideoElement>(null);
    
    const imageUrls = useMemo(() => getImageUrls(prompt.imageUrl), [prompt.imageUrl]);
    const firstImageUrl = imageUrls[0] || '';
    const { videoId: youTubeVideoId } = useMemo(() => parseYouTubeUrl(prompt.videoUrl || ''), [prompt.videoUrl]);
    const isYouTube = !!youTubeVideoId;
    const optimizedImageUrl = transformCloudinaryUrl(firstImageUrl, 'w_400,c_fill');
    const thumbnail = isYouTube ? `https://img.youtube.com/vi/${youTubeVideoId}/hqdefault.jpg` : optimizedImageUrl;

    const handleMouseEnter = () => {
        // Do not play if it's YouTube or video ref is missing
        if (isYouTube || !videoRef.current) return;
        
        // Check isNSFW: if true, do not autoplay
        if (prompt.isNSFW) return;

        videoRef.current.play().catch(e => console.log("Video play interrupted or failed", e));
    };
    
    const handleMouseLeave = () => {
        if (isYouTube || !videoRef.current) return;
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
    };

    // Container classes based on viewMode to ensure correct aspect ratio and layout
    const containerClasses = useMemo(() => {
        if (viewMode === 'compact') return "relative group overflow-hidden aspect-squareX aspect-[3/4] bg-gray-200 dark:bg-gray-700 rounded-lg shadow-md transition-all duration-300 hover:shadow-xl";
        if (viewMode === 'list') return "relative group overflow-hidden flex-shrink-0 w-32 h-32 md:w-40 md:h-40 bg-gray-200 dark:bg-gray-700 rounded-md";
        return "relative group overflow-hidden aspect-squareX aspect-[3/4] rounded-lg bg-gray-200 dark:bg-gray-700";
    }, [viewMode]);

    return (
        <div 
            className={containerClasses}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {prompt.status === 'pending' && (
                <div className="absolute top-1 left-1 z-10 bg-yellow-500/80 text-white text-xs font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                    {t('common.pending')}
                </div>
            )}
            
            {mediaError ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className={viewMode === 'list' ? "h-12 w-12" : "h-8 w-8"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
            ) : (prompt.videoUrl && !isYouTube) ? (
                <video
                    ref={videoRef}
                    src={prompt.videoUrl}
                    poster={optimizedImageUrl}
                    className={`w-full h-full object-cover ${getRotationClass(prompt.rotation, viewMode)}`}
                    muted loop playsInline preload="metadata"
                />
            ) : (
                <img 
                    src={thumbnail} 
                    alt={prompt.title} 
                    className={`w-full h-full ${
                        (prompt.rotation === 90 || prompt.rotation === -90)
                        ? 'object-contain transition-all ease-in-out duration-500'
                        : 'object-cover transition-transform duration-300'
                    } ${getRotationClass(prompt.rotation, viewMode)}`} 
                    loading="lazy" 
                />
            )}
        </div>
    );
};

export default CardMedia;