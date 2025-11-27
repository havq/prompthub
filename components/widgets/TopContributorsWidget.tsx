
import React, { useEffect, useState, useRef } from 'react';
import { TopContributorsWidgetData, TopContributor } from '../../utils/types';
import { getTopContributors } from '../../services/api';
import { Link } from 'react-router-dom';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import { calculateLevel } from '../../services/gamificationService';
import Spinner from '../Spinner';

interface TopContributorsWidgetProps {
  data: TopContributorsWidgetData;
}

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    const colors: Record<number, string> = {
        1: 'bg-yellow-400 text-yellow-900 border-yellow-200',
        2: 'bg-gray-300 text-gray-800 border-gray-200',
        3: 'bg-amber-600 text-amber-100 border-amber-500',
    };

    if (rank > 3) return <span className="text-sm font-bold text-gray-400 dark:text-gray-500">#{rank}</span>;

    return (
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${colors[rank]} shadow-sm`}>
            {rank}
        </div>
    );
};

const ContributorCard: React.FC<{ user: TopContributor; rank: number }> = ({ user, rank }) => {
    const levelInfo = calculateLevel(user.points);
    
    return (
        <Link 
            to={`/author/${user.uid}`}
            className="group relative flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:-translate-y-1 transition-all duration-300 h-full w-full"
        >
            <div className="absolute top-3 left-3">
                <RankBadge rank={rank} />
            </div>
            
            <div className="relative mb-3">
                <img 
                    src={transformCloudinaryUrl(user.photoURL || '', 'w_150,h_150,c_fill,g_auto') || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user.username)}`} 
                    alt={user.username} 
                    className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-sm group-hover:scale-105 transition-transform"
                />
                {user.isPro && (
                    <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm border-2 border-white dark:border-gray-800">
                        PRO
                    </div>
                )}
            </div>

            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate max-w-full text-center px-2">
                {user.username}
            </h3>
            
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                    Lv.{levelInfo.level}
                </span>
                <span>{user.points.toLocaleString()} pts</span>
            </div>
        </Link>
    );
};

const TopContributorsWidget: React.FC<TopContributorsWidgetProps> = ({ data }) => {
    const [contributors, setContributors] = useState<TopContributor[]>([]);
    const [loading, setLoading] = useState(true);
    const { title, subtitle, limit, layout = 'grid' } = data; // Default to 'grid'
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [activeSlide, setActiveSlide] = useState(0);
    const [totalSlides, setTotalSlides] = useState(0);

    useEffect(() => {
        const fetchContributors = async () => {
            try {
                const users = await getTopContributors();
                setContributors(users.slice(0, limit || 10));
            } catch (error) {
                console.error("Failed to fetch top contributors widget data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchContributors();
    }, [limit]);

    // Calculate total slides on mount/resize/data change
    useEffect(() => {
        if (layout !== 'slider') return;
        
        const updateSlideInfo = () => {
            if (scrollContainerRef.current) {
                const { scrollWidth, clientWidth } = scrollContainerRef.current;
                if (clientWidth > 0) {
                    setTotalSlides(Math.ceil(scrollWidth / clientWidth));
                }
            }
        };
        
        const timer = setTimeout(updateSlideInfo, 100);
        window.addEventListener('resize', updateSlideInfo);
        
        return () => {
            window.removeEventListener('resize', updateSlideInfo);
            clearTimeout(timer);
        };
    }, [contributors.length, layout, loading]);

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, clientWidth } = scrollContainerRef.current;
            const newActive = Math.round(scrollLeft / clientWidth);
            setActiveSlide(newActive);
        }
    };

    const scrollToSlide = (index: number) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                left: index * scrollContainerRef.current.clientWidth,
                behavior: 'smooth'
            });
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = current.clientWidth * 0.75; // Scroll 75% of the view
            current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Spinner size="md" /></div>;
    if (contributors.length === 0) return null;

    return (
        <div className="my-12">
            {(title || subtitle) && (
                <div className="text-center mb-8">
                    {title && <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>}
                    {subtitle && <p className="text-gray-500 dark:text-gray-400">{subtitle}</p>}
                </div>
            )}
            
            {layout === 'slider' ? (
                <div className="relative group/slider">
                    {/* Left Navigation Button */}
                    <button 
                        onClick={() => scroll('left')} 
                        className="absolute -left-4 top-1/2 -translate-y-1/2 -translate-x-3 z-10 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-2 rounded-full shadow-lg opacity-0 group-hover/slider:opacity-100 transition-all hover:scale-110 disabled:opacity-0 hidden md:block"
                        aria-label="Scroll Left"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Scroll Container */}
                    <div 
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide py-4 px-2 -mx-2"
                    >
                        {contributors.map((user, index) => (
                            <div key={user.uid} className="snap-start flex-shrink-0 w-[180px] md:w-[220px]">
                                <ContributorCard user={user} rank={index + 1} />
                            </div>
                        ))}
                    </div>

                    {/* Right Navigation Button */}
                    <button 
                        onClick={() => scroll('right')} 
                        className="absolute -right-4 top-1/2 -translate-y-1/2 translate-x-3 z-10 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-2 rounded-full shadow-lg opacity-0 group-hover/slider:opacity-100 transition-all hover:scale-110 disabled:opacity-0 hidden md:block"
                        aria-label="Scroll Right"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    
                    {/* Navigation Dots */}
                    {totalSlides > 1 && (
                        <div className="flex justify-center gap-2 mt-2">
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
            ) : (
                // Default Grid Layout
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {contributors.map((user, index) => (
                        <ContributorCard key={user.uid} user={user} rank={index + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default TopContributorsWidget;
