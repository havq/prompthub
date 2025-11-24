
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { getReels, getReelCategories } from '../services/api';
import { Reel, ReelCategoryWithCount } from '../utils/types';
import Spinner from '../components/Spinner';
import ReelThumbnail from '../components/ReelThumbnail';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getSettings } from '../services/settingsService';
import ReelsPage from './ReelsPage';
import CategoryTabs from '../components/CategoryTabs';


function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay || 500);
    return () => { clearTimeout(timer); };
  }, [value, delay]);

  return debouncedValue;
}

const ReelThumbnailSkeleton: React.FC = () => {
    return <div className="relative aspect-[9/16] bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse"></div>
};

const AdReelPlaceholder: React.FC<{ adCode: string }> = ({ adCode }) => {
    const { t } = useLanguage();
    const adContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (adContainerRef.current) {
            const container = adContainerRef.current;
            container.innerHTML = '';

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
        <div className="relative aspect-[9/16] bg-gray-200 dark:bg-gray-800 rounded-lg shadow-inner flex flex-col p-4 items-center justify-center text-center">
             <div ref={adContainerRef} className="w-full flex justify-center items-center" />
             <span className="text-xs text-gray-400 dark:text-gray-500 mt-2 tracking-widest uppercase">{t('adCard.advertisement')}</span>
        </div>
    );
};

const ReelExplorePage: React.FC = () => {
    const { reelId, categoryId, searchTerm: searchTermFromParams } = useParams<{ reelId?: string, categoryId?: string, searchTerm?: string }>();
    const navigate = useNavigate();

    const [reels, setReels] = useState<Reel[]>([]);
    const [categories, setCategories] = useState<ReelCategoryWithCount[]>([]);
    const [totalReels, setTotalReels] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const loaderRef = useRef<HTMLDivElement>(null);
    const { isPro } = useAuth();
    const { t } = useLanguage();
    
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedCategory = categoryId || searchParams.get('category') || 'All';
    const searchFromUrl = searchTermFromParams || searchParams.get('searchTerm') || '';

    const [searchTerm, setSearchTerm] = useState(searchFromUrl);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const hasFetchedInitial = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const settings = getSettings();
    const reelsAdSettings = settings.reelsAdSettings;
    
    useEffect(() => {
        getReelCategories().then(setCategories);
    }, []);

    const fetchReels = useCallback(async (pageNum: number, search: string, category: string, isNewSearch: boolean) => {
        // Cancel previous request if exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        try {
            // Note: externalApi might not support signal passing yet, but good practice for structure.
            // If getReels doesn't accept signal, the logic still prevents race condition via 'active' check or simple await.
            const response = await getReels({ page: pageNum, limit: 20, searchTerm: search, category: category });
            
            if (controller.signal.aborted) return;

            setReels(prev => isNewSearch ? response.reels : [...new Map([...prev, ...response.reels].map(item => [item.id, item])).values()]);
            setTotalReels(response.total);
            setHasMore(response.reels.length > 0);
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Failed to fetch reels:", error);
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
                hasFetchedInitial.current = true;
            }
        }
    }, []);

    const resetAndFetch = useCallback(() => {
        setPage(1);
        setHasMore(true);
        setReels([]); // Clear current list to show loading state correctly
        fetchReels(1, debouncedSearchTerm, selectedCategory, true);
    }, [debouncedSearchTerm, selectedCategory, fetchReels]);

    // Initial fetch & reset on filter change
    useEffect(() => {
        resetAndFetch();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [resetAndFetch]);
    
    // Fetch next pages
    useEffect(() => {
        if (page > 1) {
            fetchReels(page, debouncedSearchTerm, selectedCategory, false);
        }
    }, [page, debouncedSearchTerm, selectedCategory, fetchReels]);

    // Infinite Scroll Observer
    useEffect(() => {
        if (isLoading || !hasMore || reels.length === 0) return;
        
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    setPage(prev => prev + 1);
                }
            },
            {
                // Reduced rootMargin to prevent premature fetching of page 2 on initial load
                rootMargin: '100px' 
            }
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
    }, [isLoading, hasMore, reels.length]);
    
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSearchTerm = e.target.value;
        setSearchTerm(newSearchTerm);
    };
    
    useEffect(() => {
        if (debouncedSearchTerm !== searchFromUrl) {
            if (settings.routerMode === 'browser') {
                if (debouncedSearchTerm) {
                    navigate(`/reels/search/${encodeURIComponent(debouncedSearchTerm)}`);
                } else {
                    navigate(selectedCategory === 'All' ? '/reels' : `/reels/category/${selectedCategory}`);
                }
            } else {
                setSearchParams(prev => {
                    const newParams = new URLSearchParams(prev);
                    if (debouncedSearchTerm) {
                        newParams.set('searchTerm', debouncedSearchTerm);
                    } else {
                        newParams.delete('searchTerm');
                    }
                    return newParams;
                }, { replace: true });
            }
        }
    }, [debouncedSearchTerm, searchFromUrl, selectedCategory, settings.routerMode, navigate, setSearchParams]);


    const handleCategorySelect = (catId: string | 'All') => {
        if (settings.routerMode === 'browser') {
            navigate(catId === 'All' ? '/reels' : `/reels/category/${catId}`);
        } else {
            setSearchParams(prev => {
                const newParams = new URLSearchParams(prev);
                if (catId === 'All') {
                    newParams.delete('category');
                } else {
                    newParams.set('category', catId);
                }
                return newParams;
            });
        }
    };


    const handleReelClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const clickedReelId = event.currentTarget.dataset.reelId;
        if (clickedReelId) {
            navigate(`/reels/${clickedReelId}`);
        }
    };

    const itemsWithAds = useMemo(() => {
        const items: { type: 'reel' | 'ad', data: Reel | string }[] = [];
        if (isPro || !reelsAdSettings?.enabled || !reelsAdSettings.adCode) {
            return reels.map((reel) => ({ type: 'reel', data: reel }));
        }

        const { adCode, frequency, startPosition } = reelsAdSettings;

        reels.forEach((reel, i) => {
            items.push({ type: 'reel', data: reel });
            
            const currentPosition = i + 1;
            if (currentPosition >= startPosition && (currentPosition - startPosition + 1) % frequency === 0) {
                 items.push({ type: 'ad', data: adCode });
            }
        });
        return items;
    }, [reels, isPro, reelsAdSettings]);

    if (reelId) {
        return <ReelsPage startReelId={reelId} initialReels={reels} categories={categories} />;
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                    {t('reelExplorePage.title')}
                </h1>
                <p className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                    {t('reelExplorePage.subtitle')}
                </p>
            </div>
            
            <div className="max-w-lg mx-auto">
                 <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder={t('home.searchPlaceholder')}
                    className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"
                />
            </div>
            
            <CategoryTabs 
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={handleCategorySelect}
                totalPrompts={totalReels}
            />

            {isLoading && reels.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }).map((_, index) => <ReelThumbnailSkeleton key={index} />)}
                </div>
            ) : itemsWithAds.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {itemsWithAds.map((item, index) => {
                        if (item.type === 'reel') {
                            const reel = item.data as Reel;
                            return (
                                <ReelThumbnail 
                                    key={reel.id} 
                                    reel={reel}
                                    categories={categories} 
                                    onClick={handleReelClick}
                                />
                            );
                        } else {
                            return <AdReelPlaceholder key={`ad-${index}`} adCode={item.data as string} />;
                        }
                    })}
                </div>
            ) : !isLoading && hasFetchedInitial.current ? (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400">No reels found matching your search criteria.</p>
                </div>
            ) : null}

            {(isLoading || hasMore) && (
                <div ref={loaderRef} className="flex justify-center py-8">
                    {isLoading && <Spinner size="md" />}
                </div>
            )}
        </div>
    );
};

export default ReelExplorePage;
