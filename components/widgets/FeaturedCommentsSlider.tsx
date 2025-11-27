import React, { useEffect, useState, useRef } from 'react';
import { FeaturedCommentsWidgetData, Comment, Prompt } from '../../utils/types';
import { getAllComments, getPrompt } from '../../services/api';
import { Link } from 'react-router-dom';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import { useLanguage } from '../../context/LanguageContext';

interface ExtendedComment extends Comment {
    promptTitle?: string;
    promptImage?: string;
    promptCommentCount?: number;
}

// Helper function to robustly parse image URLs
const getSafeImageUrl = (imageUrlValue: string | undefined): string => {
    if (!imageUrlValue) return '';
    
    // If it's a JSON array string (e.g., '["url1", "url2"]')
    if (imageUrlValue.trim().startsWith('[') && imageUrlValue.trim().endsWith(']')) {
        try {
            const parsed = JSON.parse(imageUrlValue);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Return the first valid string URL found
                const firstUrl = parsed.find((item: any) => typeof item === 'string' && item.length > 0);
                if (firstUrl) return firstUrl;
            }
        } catch (e) {
            // Silent fail for parsing issues
        }
    }
    
    // If simple string or parsing failed, assume it's a direct URL
    return imageUrlValue;
};

const FeaturedCommentsSlider: React.FC<{ data: FeaturedCommentsWidgetData }> = ({ data }) => {
    const [comments, setComments] = useState<ExtendedComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSlide, setActiveSlide] = useState(0);
    const [totalSlides, setTotalSlides] = useState(0);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const isMounted = useRef(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { t } = useLanguage();

    useEffect(() => {
        isMounted.current = true;
        const fetchData = async () => {
            try {
                setLoading(true);
                // 1. Fetch all comments
                const allComments = await getAllComments();
                
                if (!isMounted.current) return;

                // 2. Take top N comments based on limit
                const topComments = allComments.slice(0, data.limit || 10);

                // 3. Collect unique prompt IDs from these comments
                const uniquePromptIds = [...new Set(topComments.map(c => c.promptId).filter(id => {
                    if (!id) return false;
                    const strId = String(id);
                    return !strId.includes('{') && strId !== 'undefined';
                }))];

                // 4. Fetch details for these specific prompts
                // We map promises to handle individual failures without crashing all
                const promptPromises = uniquePromptIds.map(id => 
                    getPrompt(String(id)).catch(() => null) // Silently fail for missing/deleted prompts
                );
                
                const prompts = await Promise.all(promptPromises);
                
                if (!isMounted.current) return;

                const promptMap = new Map<string, Prompt>();
                prompts.forEach(p => {
                    if (p) promptMap.set(p.id, p);
                });

                // 5. Enrich comments with prompt data
                // Filter out comments where the prompt could not be found (deleted/missing)
                const enrichedComments = topComments.reduce<ExtendedComment[]>((acc, c) => {
                    const p = promptMap.get(String(c.promptId) || '');
                    
                    if (p) {
                        acc.push({
                            ...c,
                            promptTitle: p.title,
                            promptImage: getSafeImageUrl(p.imageUrl),
                            promptCommentCount: p.commentCount || 0
                        });
                    }
                    return acc;
                }, []);

                setComments(enrichedComments);
            } catch (error) {
                console.error("Failed to fetch featured comments", error);
            } finally {
                if (isMounted.current) setLoading(false);
            }
        };
        fetchData();

        return () => {
            isMounted.current = false;
        };
    }, [data.limit]);

    // Calculate total slides on mount/resize/data change
    useEffect(() => {
        const updateSlideInfo = () => {
            if (scrollRef.current) {
                const { scrollWidth, clientWidth } = scrollRef.current;
                if (clientWidth > 0) {
                    setTotalSlides(Math.ceil(scrollWidth / clientWidth));
                }
            }
        };
        
        // Small delay to ensure rendering is complete
        const timer = setTimeout(updateSlideInfo, 100);
        window.addEventListener('resize', updateSlideInfo);
        
        return () => {
            window.removeEventListener('resize', updateSlideInfo);
            clearTimeout(timer);
        };
    }, [comments.length, loading]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const newActive = Math.round(scrollLeft / clientWidth);
            setActiveSlide(newActive);
        }
    };

    const scrollToSlide = (index: number) => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                left: index * scrollRef.current.clientWidth,
                behavior: 'smooth'
            });
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 340; // Card width + gap
            scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    if (loading) return <div className="h-64 w-full bg-gray-200 dark:bg-gray-800/20 animate-pulse rounded-xl my-8"></div>;
    if (comments.length === 0) return null;

    return (
        <div className="bg-white dark:bg-[#131519] border border-gray-200 dark:border-gray-700 rounded-xl p-6 my-8 shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 pb-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-yellow-500">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                </svg>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">{data.title || 'TOP BÌNH LUẬN'}</h2>
            </div>

            <div className="relative group/slider">
                <button 
                    onClick={() => scroll('left')} 
                    className="absolute -left-2 top-1/2 -translate-y-1/2 -ml-3 z-10 bg-white dark:bg-[#2a2e36] hover:bg-gray-100 dark:hover:bg-[#3a3e46] text-gray-600 dark:text-white p-2 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 group-hover/slider:opacity-100 transition-all hover:scale-110"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                
                <div 
                    ref={scrollRef} 
                    onScroll={handleScroll}
                    className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide py-2"
                >
                    {comments.map((comment) => (
                        <div key={comment.id} className="snap-start flex-shrink-0 w-[320px] bg-gray-50 dark:bg-[#1e2128] border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-colors flex h-40 shadow-sm dark:shadow-none">
                            {/* Comment Content */}
                            <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <img src={transformCloudinaryUrl(comment.userPhotoURL || '', 'w_50,h_50,c_fill')} className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-gray-600" alt={comment.username} />
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate flex items-center gap-1">
                                                {comment.username}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 mb-2 leading-relaxed">{comment.text}</p>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700/50 pt-2 mt-auto">
                                    <span className="flex items-center gap-1 ml-auto hover:text-gray-700 dark:hover:text-white cursor-pointer">
                                        💬 {comment.promptCommentCount !== undefined ? comment.promptCommentCount : (comment.replies ? comment.replies.length : 0)}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Prompt Thumbnail */}
                            <div className="w-24 flex-shrink-0 relative h-full bg-black">
                                <Link to={`/?prompt=${comment.promptId}`} className="block h-full w-full">
                                    {comment.promptImage ? (
                                        <img 
                                            src={transformCloudinaryUrl(comment.promptImage, 'w_200,h_300,c_fill')} 
                                            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" 
                                            alt="Prompt" 
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 via-transparent to-transparent dark:from-[#1e2128] dark:via-transparent dark:to-transparent w-1/2"></div>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={() => scroll('right')} 
                    className="absolute -right-2 top-1/2 -translate-y-1/2 -mr-3 z-10 bg-white dark:bg-[#2a2e36] hover:bg-gray-100 dark:hover:bg-[#3a3e46] text-gray-600 dark:text-white p-2 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 group-hover/slider:opacity-100 transition-all hover:scale-110"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>

                 {/* Navigation Dots */}
                 {totalSlides > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                        {Array.from({ length: totalSlides }).map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => scrollToSlide(idx)}
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    activeSlide === idx 
                                    ? 'w-6 bg-indigo-600 dark:bg-indigo-400' 
                                    : 'w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                                }`}
                                aria-label={`Go to slide ${idx + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeaturedCommentsSlider;