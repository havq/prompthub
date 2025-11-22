
import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
// @ts-ignore
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getReels, toggleReelLike, getReel, getReelCategories } from '../services/api';
import { Reel, BannerAdSettings, ReelCategory } from '../types';
import Spinner from '../components/Spinner';
import ReelPlayer from '../components/ReelPlayer';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import LoginSuggestionModal from '../components/LoginSuggestionModal';
import CommentsModal from '../components/CommentsModal';
import { getSettings } from '../services/settingsService';
import BannerAd from '../components/BannerAd';
import ReelsLeftSidebar from '../components/ReelsLeftSidebar';

interface ReelsPageProps {
    startReelId: string;
    initialReels?: Reel[];
    categories: ReelCategory[];
}

const AdReel: React.FC<{ adCode: string }> = ({ adCode }) => {
    const { t } = useLanguage();
    const adContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (adContainerRef.current) {
            const container = adContainerRef.current;
            container.innerHTML = ''; // Clear previous content

            const fragment = document.createRange().createContextualFragment(adCode);
            container.appendChild(fragment);

            const scripts = container.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                for (const attr of oldScript.attributes) {
                    newScript.setAttribute(attr.name, attr.value);
                }
                if (oldScript.innerHTML) {
                    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                }
                oldScript.parentNode?.replaceChild(newScript, oldScript);
            });
        }
    }, [adCode]);

    return (
        <div className="h-full w-full snap-start relative flex items-center justify-center bg-black">
           <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg shadow-inner flex flex-col h-full border border-dashed border-gray-300 dark:border-gray-700 w-full p-4 items-center justify-center max-w-md max-h-[80vh] relative">
                <div ref={adContainerRef} className="w-full flex justify-center items-center" />
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-2 tracking-widest uppercase">{t('adCard.advertisement')}</span>
                
                <div className="absolute bottom-8 left-0 right-0 w-max mx-auto flex flex-col items-center justify-center text-gray-800 dark:text-white/70 animate-bounce pointer-events-none">
                    <span className="text-xs font-semibold">{t('reels.swipeDown')}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
           </div>
        </div>
    );
};

const AD_CLOSED_TIMESTAMP_KEY = 'reelsBannerAdClosedTimestamp';

const ReelsPage: React.FC<ReelsPageProps> = ({ startReelId, initialReels, categories }) => {
    const [reels, setReels] = useState<Reel[]>(initialReels || []);
    const [likedReels, setLikedReels] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(!initialReels || initialReels.length === 0);
    const [hasMore, setHasMore] = useState(true);
    const [pageToFetch, setPageToFetch] = useState(1);
    const hasStartedFetching = useRef(!!initialReels && initialReels.length > 0);

    const containerRef = useRef<HTMLDivElement>(null);
    const loaderRef = useRef<HTMLDivElement>(null);
    const { t } = useLanguage();
    const { currentUser, isPro } = useAuth();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [activeReelForComments, setActiveReelForComments] = useState<Reel | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const [reelsAdSettings, setReelsAdSettings] = useState(() => getSettings().reelsAdSettings);
    const [reelsBannerAdSettings, setReelsBannerAdSettings] = useState(() => getSettings().reelsBannerAdSettings);
    
    const [isBannerVisible, setIsBannerVisible] = useState(() => {
        const closedTimestamp = sessionStorage.getItem(AD_CLOSED_TIMESTAMP_KEY);
        if (!closedTimestamp) return true;
        
        const delayMinutes = getSettings().reelsBannerAdSettings?.reappearDelayMinutes ?? 30;
        if (delayMinutes === 0) return false;

        const delayMs = delayMinutes * 60 * 1000;
        return Date.now() - parseInt(closedTimestamp, 10) > delayMs;
    });

    // Track which navigation request we have processed to avoid reopening modal on close
    const [processedNavKey, setProcessedNavKey] = useState<string | null>(null);

    const handleReelInView = useCallback((reelId: string) => {
        // Prevent IPC flooding / navigation throttling errors:
        // 1. If we are currently on the Explore page (e.g. user clicked "Back"), do not attempt to navigate back to a specific reel ID.
        if (location.pathname.includes('/reels/explore')) return;
        
        // 2. If the URL already ends with this reel ID, do not navigate (redundant replacement).
        if (location.pathname.endsWith(`/${reelId}`)) return;

        const currentState = location.state as any || {};
        
        // Create a copy and strip 'openComments' to prevent the modal from reopening loop if closed.
        // We keep 'commentId' to preserve highlighting while viewing this reel.
        const persistentState = { ...currentState };
        if ('openComments' in persistentState) {
            delete persistentState.openComments;
        }
        
        navigate(`/reels/${reelId}`, { replace: true, state: persistentState });
    }, [navigate, location.state, location.pathname]);

    useEffect(() => {
        const handleSettingsChange = () => {
            setReelsAdSettings(getSettings().reelsAdSettings);
            setReelsBannerAdSettings(getSettings().reelsBannerAdSettings);
        };
        window.addEventListener('storage', handleSettingsChange);
        return () => window.removeEventListener('storage', handleSettingsChange);
    }, []);
    
    // Effect to handle auto-opening comments if navigated from notification
    useEffect(() => {
        const currentNavKey = location.key || 'initial';
        
        // Check if we should open comments:
        // 1. We have a startReelId
        // 2. State requests opening comments
        // 3. Reels are loaded
        // 4. Modal is not currently open (or we are switching reels)
        // 5. We haven't processed this specific navigation event yet
        if (startReelId && location.state?.openComments && reels.length > 0 && !activeReelForComments) {
            if (processedNavKey !== currentNavKey) {
                const targetReel = reels.find(r => r.id === startReelId);
                if (targetReel) {
                    setActiveReelForComments(targetReel);
                    setProcessedNavKey(currentNavKey);
                }
            }
        }
    }, [startReelId, location.state, reels, activeReelForComments, location.key, processedNavKey]);
    
    useEffect(() => {
        if (isBannerVisible) return;

        const checkInterval = setInterval(() => {
            const closedTimestamp = sessionStorage.getItem(AD_CLOSED_TIMESTAMP_KEY);
            if (!closedTimestamp) {
                setIsBannerVisible(true);
                return;
            }
            
            const delayMinutes = getSettings().reelsBannerAdSettings?.reappearDelayMinutes ?? 30;
            if (delayMinutes === 0) {
                clearInterval(checkInterval);
                return;
            }

            const delayMs = delayMinutes * 60 * 1000;
            if (Date.now() - parseInt(closedTimestamp, 10) > delayMs) {
                setIsBannerVisible(true);
            }
        }, 30000);

        return () => clearInterval(checkInterval);
    }, [isBannerVisible]);

    const fetchAndAppendReels = useCallback(async () => {
        if (isLoading || !hasMore) return;
        setIsLoading(true);
        try {
            const response = await getReels({ page: pageToFetch, limit: 5 });
            hasStartedFetching.current = true;
    
            if (response.reels.length === 0) {
                setHasMore(false);
            } else {
                setReels(prev => {
                    const existingIds = new Set(prev.map(r => r.id));
                    const newReels = response.reels.filter(r => !existingIds.has(r.id));
                    return [...prev, ...newReels];
                });
                setPageToFetch(prev => prev + 1);
            }
            setLikedReels(prev => ({ ...prev, ...(response.likedIds || {}) }));
        } catch (error) {
            console.error("Failed to fetch more reels:", error);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, hasMore, pageToFetch]);

    const fetchAndInitialize = useCallback(async () => {
        if (!startReelId) {
            fetchAndAppendReels();
            return;
        }

        setIsLoading(true);
        try {
            const [startReelData, feedResponse] = await Promise.all([
                getReel(startReelId),
                getReels({ page: 1, limit: 5 })
            ]);
            hasStartedFetching.current = true;

            const combinedReels = [startReelData, ...feedResponse.reels.filter(r => r.id !== startReelId)];
            const uniqueReels = Array.from(new Map(combinedReels.map(item => [item.id, item])).values());
            
            setReels(uniqueReels);
            setLikedReels(prev => ({ ...prev, ...(feedResponse.likedIds || {}) }));
            setPageToFetch(2);
            setHasMore(feedResponse.reels.length > 0);
        } catch (error) {
            console.error("Failed to initialize reels feed:", error);
            // Fallback to normal feed if specific reel fails
            fetchAndAppendReels();
        } finally {
            setIsLoading(false);
        }
    }, [startReelId, fetchAndAppendReels]);

    useEffect(() => {
        if (!initialReels || initialReels.length === 0) {
            fetchAndInitialize();
        } else {
            // We have initial reels from explore page, set next page to fetch correctly
            const REELS_PER_PAGE = 5;
            setPageToFetch(Math.ceil(initialReels.length / REELS_PER_PAGE) + 1);
        }
    }, [initialReels, fetchAndInitialize]);
    
    useEffect(() => {
        if (!hasMore || (initialReels && initialReels.length > 0 && pageToFetch === 1)) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !isLoading) {
                    fetchAndAppendReels();
                }
            },
            { root: containerRef.current, threshold: 0.5 }
        );

        const currentLoader = loaderRef.current;
        if (currentLoader) {
            observer.observe(currentLoader);
        }

        return () => {
            if (currentLoader) {
                observer.unobserve(currentLoader);
            }
        };
    }, [fetchAndAppendReels, hasMore, isLoading, initialReels, pageToFetch]);
    
    useLayoutEffect(() => {
        if (startReelId && reels.length > 0 && containerRef.current) {
            setTimeout(() => {
                if (containerRef.current) {
                    const startElement = containerRef.current.querySelector<HTMLElement>(`[data-reel-id="${startReelId}"]`);
                    if (startElement) {
                        containerRef.current.scrollTop = startElement.offsetTop;
                    }
                }
            }, 0);
        }
    }, [startReelId, reels]);

    const handleLikeToggle = async (reelId: string) => {
        if (!currentUser) {
            setIsLoginModalOpen(true);
            return;
        }
        const originalReels = [...reels];
        const originalLikedReels = {...likedReels};

        setLikedReels(prev => ({ ...prev, [reelId]: !prev[reelId] }));
        setReels(prev => prev.map(reel => {
            if (reel.id === reelId) {
                const isLiked = likedReels[reelId];
                return { ...reel, likeCount: (reel.likeCount || 0) + (isLiked ? -1 : 1) };
            }
            return reel;
        }));

        try {
            await toggleReelLike(reelId);
        } catch (error) {
            console.error("Failed to toggle like:", error);
            setReels(originalReels);
            setLikedReels(originalLikedReels);
        }
    };

    const handleCommentCountChange = (reelId: string, change: number) => {
        setReels(prevReels => prevReels.map(reel => 
            reel.id === reelId ? { ...reel, commentCount: Math.max(0, (reel.commentCount || 0) + change) } : reel
        ));
    };

    const handleViewPrompt = (promptId: string) => {
        navigate(`/?prompt=${promptId}`);
    };
    
    const handleCloseBanner = () => {
        sessionStorage.setItem(AD_CLOSED_TIMESTAMP_KEY, Date.now().toString());
        setIsBannerVisible(false);
    };

    const isBannerAdVisible = isBannerVisible && !isPro && reelsBannerAdSettings?.enabled && !!reelsBannerAdSettings.adCode;

    const itemsWithAds = useMemo(() => {
        const items: React.ReactNode[] = [];
        if (isPro || !reelsAdSettings?.enabled || !reelsAdSettings.adCode || reels.length === 0) {
            return reels.map(reel => <ReelPlayer key={reel.id} reel={reel} categories={categories} isLiked={!!likedReels[reel.id]} onLikeToggle={handleLikeToggle} containerRef={containerRef} isLoggedIn={!!currentUser} onOpenComments={() => setActiveReelForComments(reel)} onViewPrompt={handleViewPrompt} isBannerVisible={isBannerAdVisible} onInView={handleReelInView} />);
        }

        const { adCode, frequency, startPosition } = reelsAdSettings;

        reels.forEach((reel, i) => {
            items.push(<ReelPlayer key={reel.id} reel={reel} categories={categories} isLiked={!!likedReels[reel.id]} onLikeToggle={handleLikeToggle} containerRef={containerRef} isLoggedIn={!!currentUser} onOpenComments={() => setActiveReelForComments(reel)} onViewPrompt={handleViewPrompt} isBannerVisible={isBannerAdVisible} onInView={handleReelInView} />);
            
            const currentPosition = i + 1;
            if (currentPosition >= startPosition && (currentPosition - startPosition + 1) % frequency === 0) {
                 items.push(<AdReel key={`ad-${currentPosition}`} adCode={adCode} />);
            }
        });

        return items;
    }, [reels, reelsAdSettings, isPro, likedReels, handleLikeToggle, currentUser, handleViewPrompt, isBannerAdVisible, handleReelInView, categories]);


    return (


        <div className="flex h-screen w-full bg-black">
             <ReelsLeftSidebar />

             <div className="fixed inset-0 lg:static lg:w-auto lg:flex-1 bg-black z-50 transition-all duration-300">
                <div className="h-full w-full relative">

                    {isLoginModalOpen && <LoginSuggestionModal onClose={() => setIsLoginModalOpen(false)} />}
                    {activeReelForComments && (
                        <CommentsModal 
                            reel={activeReelForComments} 
                            onClose={() => setActiveReelForComments(null)}
                            onCommentCountChange={(change) => handleCommentCountChange(activeReelForComments.id, change)}
                            highlightCommentId={location.state?.commentId}
                        />
                    )}
                    
                    <div 
                        ref={containerRef}
                        className="h-full w-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide relative"
                    >

                        {itemsWithAds}

                        {(isLoading || hasMore) && (
                            <div ref={loaderRef} className="h-[100vh] w-full snap-start flex items-center justify-center">
                                {isLoading && <Spinner size="lg" />}
                            </div>
                        )}
                    </div>

                    <Link
                        to="/reels/explore"
                        className="absolute top-5 left-5 z-[100] lg:hidden transform-gpu p-2 bg-black/40 rounded-full text-white hover:bg-black/60 transition-colors"
                        aria-label={t('reels.backToExplore')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>

                    {isBannerAdVisible && (
                        <div className="absolute bottom-0 left-0 right-0 z-20 p-2 bg-black/30 backdrop-blur-sm">
                            <BannerAd adCode={reelsBannerAdSettings!.adCode} className="my-0" onClose={handleCloseBanner} />
                        </div>
                    )}
                </div>
            </div>
        </div>

    );
};

export default ReelsPage;
