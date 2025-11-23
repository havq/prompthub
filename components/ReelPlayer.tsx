
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Reel, ReelCategory } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { incrementReelViewCount } from '../services/api';
import ShareButton from './ShareButton';
// @ts-ignore
import { Link, useNavigate } from 'react-router-dom';
import { transformCloudinaryUrl } from '../services/cloudinaryUtils';
import { useAuth } from '../context/AuthContext';
import { getSettings } from '../services/settingsService';
import { getImageUrls } from './PromptDetail/utils'; // Helper for JSON parsing
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const parseYouTubeUrl = (url: string): { videoId: string | null } => {
    if (!url) {
        return { videoId: null };
    }
    let videoId: string | null = null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    if (match && match[1]) {
        videoId = match[1];
    }
    return { videoId };
};

interface ReelPlayerProps {
    reel: Reel;
    categories: ReelCategory[];
    isLiked: boolean;
    onLikeToggle: (reelId: string) => void;
    onOpenComments: () => void;
    containerRef: React.RefObject<HTMLDivElement>;
    isLoggedIn: boolean;
    onViewPrompt: (promptId: string) => void;
    isBannerVisible: boolean;
    onInView: (reelId: string) => void;
}

const ReelPlayer: React.FC<ReelPlayerProps> = ({ reel, categories, isLiked, onLikeToggle, onOpenComments, containerRef, isLoggedIn, onViewPrompt, isBannerVisible, onInView }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const reelRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isNSFWConfirmed, setIsNSFWConfirmed] = useState(false);
    const { t } = useLanguage();
    const navigate = useNavigate();

    // Unified Media Items Logic (Video + Images)
    const mediaItems = useMemo(() => {
        const items: { type: 'image' | 'video' | 'youtube'; url: string; id: string }[] = [];
        const imageUrls = getImageUrls(reel.imageUrl || '');
        const { videoId } = parseYouTubeUrl(reel.videoUrl || '');

        if (reel.videoUrl) {
            if (videoId) {
                items.push({ 
                    type: 'youtube', 
                    url: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&showinfo=0&rel=0`,
                    id: 'video-youtube' 
                });
            } else {
                items.push({ type: 'video', url: reel.videoUrl, id: 'video-native' });
            }
        }
        
        imageUrls.forEach((url, index) => {
            items.push({ type: 'image', url, id: `image-${index}` });
        });

        return items;
    }, [reel.videoUrl, reel.imageUrl]);

    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    
    const goToNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentMediaIndex(prevIndex => (prevIndex + 1) % mediaItems.length);
    };

    const goToPrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentMediaIndex(prevIndex => (prevIndex - 1 + mediaItems.length) % mediaItems.length);
    };

    const showNSFWOverlay = reel.isNSFW && !isNSFWConfirmed;
    const currentMedia = mediaItems[currentMediaIndex];
    const isVideoActive = currentMedia?.type === 'video';
    const isYouTubeActive = currentMedia?.type === 'youtube';

    // Intersection Observer for play/pause of VIDEO
    useEffect(() => {
        const videoElement = videoRef.current;
        const currentReelRef = reelRef.current;
        if (!currentReelRef) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    // Only autoplay if active item is video AND not NSFW blocked
                    if (isVideoActive && videoElement && !showNSFWOverlay) {
                        videoElement.play().catch(e => console.log("Autoplay was prevented.", e));
                        setIsPlaying(true);
                    }
                    onInView(reel.id);
                    // Increment view count logic...
                    const viewedKey = `viewed_reel_${reel.id}`;
                    if (!sessionStorage.getItem(viewedKey) && isLoggedIn) {
                        incrementReelViewCount(reel.id);
                        sessionStorage.setItem(viewedKey, 'true');
                    }
                } else {
                    if (videoElement) {
                        videoElement.pause();
                        videoElement.currentTime = 0;
                        setIsPlaying(false);
                    }
                }
            },
            {
                root: containerRef.current,
                threshold: 0.6
            }
        );

        observer.observe(currentReelRef);

        return () => {
            observer.disconnect();
        };
    }, [reel.id, containerRef, isLoggedIn, onInView, showNSFWOverlay, isVideoActive, currentMediaIndex]); // Re-run when index changes to attach to new video element if needed
    
    // Handle transition from NSFW overlay to content
    useEffect(() => {
        if (!showNSFWOverlay && isVideoActive && videoRef.current) {
             const rect = reelRef.current?.getBoundingClientRect();
             const containerRect = containerRef.current?.getBoundingClientRect();
             
             if (rect && containerRect) {
                 const isVisible = (rect.top >= containerRect.top && rect.bottom <= containerRect.bottom);
                 if (isVisible) {
                     videoRef.current.play().catch(e => console.log("Play after NSFW confirmation prevented", e));
                     setIsPlaying(true);
                 }
             }
        }
    }, [showNSFWOverlay, containerRef, isVideoActive]);

    const handleVideoClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isYouTubeActive || showNSFWOverlay) return;
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                videoRef.current.play();
                setIsPlaying(true);
            }
        }
    };

    const handleMuteToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMuted(prev => !prev);
    };
    
    const handleLikeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onLikeToggle(reel.id);
    };
    
    const handleCommentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onOpenComments();
    };

    const handleViewPromptClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (reel.promptId) {
            onViewPrompt(reel.promptId);
        }
    };

    const renderCaption = (text: string) => {
        const parts = text.split(/(#\w+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('#')) {
                const tag = part.substring(1);
                return <Link key={index} to={`/?tag=${tag}`} className="font-bold hover:underline" onClick={(e:any) => e.stopPropagation()}>{part}</Link>;
            }
            return part;
        });
    };
    
    const { routerMode, appUrl } = getSettings();
    const baseUrl = appUrl || window.location.origin;
    const reelShareUrl = (routerMode === 'browser')
        ? `${baseUrl}/reels/${reel.id}`
        : `${baseUrl}/#/reels/${reel.id}`;
    
    const reelCategories = useMemo(() => {
        return (reel.categoryIds || [])
            .map(id => categories.find(c => c.id === id))
            .filter((c): c is ReelCategory => c !== undefined);
    }, [reel.categoryIds, categories]);


    return (
        <div ref={reelRef} data-reel-id={reel.id} className="h-full w-full snap-start relative flex items-center justify-center bg-black">
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
                        <button onClick={() => navigate('/')} className="bg-gray-800 text-white font-medium py-2 px-6 rounded-full hover:bg-gray-700 transition-colors shadow-lg border border-gray-700">{t('common.backToHome')}</button>
                        <button onClick={() => setIsNSFWConfirmed(true)} className="bg-white text-black font-bold py-2 px-8 rounded-full hover:bg-gray-200 transition-colors shadow-lg transform hover:scale-105 active:scale-95">{t('promptDetail.confirmAge')}</button>
                    </div>
                </div>
            )}

            {/* Slider Navigation Controls */}
            {mediaItems.length > 1 && !showNSFWOverlay && (
                <>
                    <button onClick={goToPrev} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-opacity" title="Previous">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={goToNext} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-opacity" title="Next">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <div className="absolute bottom-40 left-0 right-0 z-20 flex justify-center items-center gap-1.5 pointer-events-none">
                         {mediaItems.map((_, index) => (
                            <div key={index} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${currentMediaIndex === index ? 'bg-white w-3' : 'bg-white/40'}`}></div>
                        ))}
                    </div>
                </>
            )}

            {/* Media Rendering */}
            {currentMedia ? (
                currentMedia.type === 'youtube' ? (
                     <iframe
                        src={`https://www.youtube.com/embed/${parseYouTubeUrl(currentMedia.url).videoId}?autoplay=${showNSFWOverlay ? 0 : 1}&mute=1&loop=1&playlist=${parseYouTubeUrl(currentMedia.url).videoId}&controls=0&modestbranding=1&showinfo=0&rel=0`}
                        className="w-full h-full object-contain"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        title={reel.title}
                    ></iframe>
                ) : currentMedia.type === 'video' ? (
                    <video
                        ref={videoRef}
                        src={currentMedia.url}
                        loop
                        muted={isMuted}
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain"
                        onClick={handleVideoClick}
                    />
                ) : (
                    <TransformWrapper centerOnInit={true}>
                        {({ zoomIn, zoomOut, resetTransform }) => (
                           <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img 
                                    src={transformCloudinaryUrl(currentMedia.url, 'w_1080')} 
                                    alt="Reel content" 
                                    className={`max-w-full max-h-full object-contain ${showNSFWOverlay ? 'filter blur-2xl scale-110' : ''}`}
                                    onClick={(e) => e.stopPropagation()}
                                />
                           </TransformComponent>
                        )}
                    </TransformWrapper>
                )
            ) : (
                 <div className="absolute inset-0 flex items-center justify-center text-white">Media not found</div>
            )}

            {!isPlaying && isVideoActive && !showNSFWOverlay && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white/50" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                </div>
            )}
            
            <div className={`absolute bottom-0 left-0 right-0 p-4 text-white bg-gradient-to-t from-black/60 via-black/30 to-transparent ${isBannerVisible ? 'pb-28' : 'pb-4'} pointer-events-none`}>
                <div className="flex justify-between items-end pointer-events-auto">
                    <div className="flex-1 min-w-0 pr-4 space-y-2">
                        <Link to={`/author/${reel.authorId}`} className="text-sm font-bold opacity-90 hover:underline" onClick={e => e.stopPropagation()}>@{reel.authorName || 'Anonymous'}</Link>
                        <p className="text-base text-shadow-md">{renderCaption(reel.title)}</p>
                        {reelCategories.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {reelCategories.map(cat => {
                                    const link = '/reels/explore?category=' + cat.id; // Simplification
                                    return (
                                        <Link key={cat.id} to={link} className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full hover:bg-white/30 transition-colors" onClick={e => e.stopPropagation()}>
                                            {cat.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-center space-y-5 ml-4">
                        <Link to={`/author/${reel.authorId}`} onClick={e => e.stopPropagation()} className="relative block" aria-label={`View profile of ${reel.authorName}`}>
                           <img src={transformCloudinaryUrl(reel.authorPhotoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(reel.authorName || 'A')}`, 'w_100,h_100,c_fill,g_auto')} alt={reel.authorName || 'Author avatar'} className="w-12 h-12 rounded-full object-cover border-2 border-white"/>
                        </Link>
                        {reel.promptId && (
                            <button onClick={handleViewPromptClick} className="flex flex-col items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                <span className="text-xs font-semibold mt-1">Prompt</span>
                            </button>
                        )}
                        <button onClick={handleLikeClick} className="flex flex-col items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 transition-all duration-200 transform ${isLiked ? 'text-red-500 scale-110' : 'text-white'}`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs font-semibold mt-1">{reel.likeCount}</span>
                        </button>
                        <button onClick={handleCommentClick} className="flex flex-col items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="text-xs font-semibold mt-1">{reel.commentCount}</span>
                        </button>
                        <ShareButton shareUrl={reelShareUrl} shareText={reel.title} className="flex flex-col items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367 2.684z" />
                            </svg>
                            <span className="text-xs font-semibold mt-1">{t('common.share')}</span>
                        </ShareButton>
                        {isVideoActive && (
                            <button onClick={handleMuteToggle} className="flex flex-col items-center">
                                {isMuted ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReelPlayer;
