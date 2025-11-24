
import React, { useRef, useMemo } from 'react';
import { Reel, ReelCategory } from '../utils/types';

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

interface ReelThumbnailProps {
    reel: Reel;
    categories: ReelCategory[];
    onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const formatCount = (count: number | undefined): string => {
    const num = Number(count || 0);
    if (num < 1000) {
      return num.toLocaleString();
    }
    const units = ['k', 'm', 'b', 't'];
    const unit = Math.floor((num.toFixed(0).length - 1) / 3) - 1;
    
    if (unit >= units.length) {
        return num.toLocaleString();
    }
    
    const value = num / Math.pow(1000, unit + 1);
    const truncatedValue = Math.floor(value * 10) / 10;
    
    return String(truncatedValue) + units[unit];
};

const ReelThumbnail: React.FC<ReelThumbnailProps> = ({ reel, categories, onClick }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { videoId: youTubeVideoId } = useMemo(() => parseYouTubeUrl(reel.videoUrl), [reel.videoUrl]);
    const isYouTube = !!youTubeVideoId;

    const handleMouseEnter = () => {
        // Do not autoplay if it's YouTube OR if the content is NSFW
        if (isYouTube || reel.isNSFW) return;
        videoRef.current?.play().catch(e => {});
    };

    const handleMouseLeave = () => {
        if (isYouTube || !videoRef.current) return;
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
    };

    const reelCategories = useMemo(() => {
        return (reel.categoryIds || [])
            .map(id => categories.find(c => c.id === id))
            .filter((c): c is ReelCategory => c !== undefined);
    }, [reel.categoryIds, categories]);
    
    return (
        <div
            data-reel-id={reel.id}
            className="relative group aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-shadow"
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {isYouTube ? (
                <img 
                    src={`https://img.youtube.com/vi/${youTubeVideoId}/hqdefault.jpg`} 
                    alt={reel.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                />
            ) : (
                <video
                    ref={videoRef}
                    src={reel.videoUrl}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className={`w-full h-full object-cover transition-transform duration-300 ${!reel.isNSFW ? 'group-hover:scale-110' : ''}`}
                />
            )}
            
             {/* NSFW Badge - Top Right */}
             {reel.isNSFW && (
                <div className="absolute top-2 right-2 z-20 pointer-events-none">
                     <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm">NSFW</span>
                </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                {/* Categories at the top */}
                {reelCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {reelCategories.slice(0, 2).map(cat => (
                            <span key={cat.id} className="text-white text-[10px] font-semibold bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">{cat.name}</span>
                        ))}
                    </div>
                )}
                {/* Spacer to push stats to the bottom */}
                <div />
                
                {/* Stats at the bottom */}
                <div className="text-white text-sm flex items-center justify-between font-bold">
                    <div className="flex items-center gap-1.5" title={`${reel.likeCount || 0} likes`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        <span>{formatCount(reel.likeCount)}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title={`${reel.commentCount || 0} comments`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>{formatCount(reel.commentCount)}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title={`${reel.viewCount || 0} views`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                           <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.523 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        <span>{formatCount(reel.viewCount)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReelThumbnail;