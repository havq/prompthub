
import React, { useRef, useState, useEffect } from 'react';
import { Post } from '../../types';
import RelatedPostCard from './RelatedPostCard';

const RelatedPostsSection: React.FC<{ relatedPosts: Post[] }> = ({ relatedPosts }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showScrollButtons, setShowScrollButtons] = useState(false);

    useEffect(() => {
        const checkScrollable = () => {
            if (scrollContainerRef.current) {
                const { scrollWidth, clientWidth } = scrollContainerRef.current;
                setShowScrollButtons(scrollWidth > clientWidth);
            }
        };
    
        checkScrollable();
        window.addEventListener('resize', checkScrollable);
        return () => window.removeEventListener('resize', checkScrollable);
    }, [relatedPosts]);

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    if (relatedPosts.length === 0) return null;

    return (
        <section className="py-8 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 px-8">Related Posts</h2>
            <div className="relative">
                {showScrollButtons && (
                    <>
                        <button onClick={() => handleScroll('left')} className="absolute top-1/2 left-2 -translate-y-1/2 z-10 p-2 bg-white/50 dark:bg-black/50 rounded-full backdrop-blur-sm hover:bg-white/80 dark:hover:bg-black/80 transition-colors" aria-label="Scroll left">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={() => handleScroll('right')} className="absolute top-1/2 right-2 -translate-y-1/2 z-10 p-2 bg-white/50 dark:bg-black/50 rounded-full backdrop-blur-sm hover:bg-white/80 dark:hover:bg-black/80 transition-colors" aria-label="Scroll right">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </>
                )}
                <div ref={scrollContainerRef} className="flex gap-6 overflow-x-auto snap-x mandatory scrollbar-hide scroll-smooth px-8">
                    {relatedPosts.map(relatedPost => (
                        <div key={relatedPost.id} className="w-4/5 sm:w-1/2 md:w-1/3 flex-shrink-0 snap-end">
                            <RelatedPostCard post={relatedPost} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default RelatedPostsSection;
