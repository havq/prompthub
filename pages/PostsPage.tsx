import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getPosts, getPostCategories } from '../services/api';
import { Post, PostCategoryWithCount } from '../utils/types';
import { useLanguage } from '../context/LanguageContext';
import Spinner from '../components/Spinner';
import Pagination from '../components/Pagination';
import CategoryTabs from '../components/CategoryTabs';
import { GetPromptsParams } from '../services/externalApi';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { RightSidebar } from '../components/RightSidebar';
import { getSettings } from '../services/settingsService';
import PostCard from '../components/PostCard';
import PostCardSkeleton from '../components/PostCardSkeleton';
import { buildUrl } from '../utils/permalinks';

function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay || 500);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const PostsPage: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [totalPosts, setTotalPosts] = useState(0);
    const [categories, setCategories] = useState<PostCategoryWithCount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { t } = useLanguage();
    
    const params = useParams<{ categoryId?: string, searchTerm?: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const settings = getSettings();
    
    const { postsPerPage, postsPaginationStyle } = settings;
    const POSTS_PER_PAGE = postsPerPage || 9;
    const paginationStyle = postsPaginationStyle || 'pagination';

    const [currentPage, setCurrentPage] = useState(1);
    const selectedCategory = params.categoryId || searchParams.get('category') || 'All';
    const searchFromUrl = params.searchTerm || searchParams.get('searchTerm') || '';

    const [searchInput, setSearchInput] = useState(searchFromUrl);
    const debouncedSearchTerm = useDebounce(searchInput, 500);

    const [hasMore, setHasMore] = useState(true);
    const loaderRef = useRef<HTMLDivElement>(null);
    
    const resetPaging = useCallback(() => {
        setCurrentPage(1);
        if (paginationStyle === 'infiniteScroll') {
            setPosts([]);
        }
    }, [paginationStyle]);

    useEffect(() => {
        if (searchFromUrl !== searchInput) {
            setSearchInput(searchFromUrl);
        }
        resetPaging();
    }, [selectedCategory, searchFromUrl, resetPaging]);

    // Fetch categories only once on component mount
    useEffect(() => {
        getPostCategories().then(setCategories).catch(err => console.error("Failed to load post categories", err));
    }, []);


    useEffect(() => {
        const fetchPosts = async () => {
            setIsLoading(true);
            try {
                const params: GetPromptsParams = {
                    page: currentPage,
                    limit: POSTS_PER_PAGE,
                    sortBy: 'newest',
                    category: selectedCategory,
                    searchTerm: searchFromUrl,
                };
    
                const { posts: fetchedPosts, total } = await getPosts(params);
                
                if (paginationStyle === 'infiniteScroll' && currentPage > 1) {
                    setPosts(prev => {
                        const uniquePosts = Array.from(new Map([...prev, ...fetchedPosts].map(item => [item.id, item])).values());
                        setHasMore(uniquePosts.length < total);
                        return uniquePosts;
                    });
                } else {
                    setPosts(fetchedPosts);
                    setHasMore(fetchedPosts.length < total);
                }
                setTotalPosts(total);
    
            } catch (error) {
                console.error("Failed to fetch posts:", error);
                setHasMore(false);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPosts();
    }, [currentPage, selectedCategory, searchFromUrl, POSTS_PER_PAGE, paginationStyle]);

    useEffect(() => {
        if (paginationStyle !== 'infiniteScroll' || isLoading || !hasMore) return;

        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                setCurrentPage(prev => prev + 1);
            }
        }, { rootMargin: '400px' });

        const currentLoader = loaderRef.current;
        if (currentLoader) {
            observer.observe(currentLoader);
        }

        return () => {
            if (currentLoader) {
                observer.unobserve(currentLoader);
            }
        };
    }, [paginationStyle, isLoading, hasMore]);

    useEffect(() => {
        if (debouncedSearchTerm !== searchFromUrl) {
            if (settings.routerMode === 'browser') {
                if (debouncedSearchTerm) {
                    navigate(`/posts/search/${encodeURIComponent(debouncedSearchTerm)}`);
                } else {
                    navigate(selectedCategory === 'All' ? '/posts' : buildUrl('postCategory', { categoryId: selectedCategory }));
                }
            } else {
                const newParams = new URLSearchParams(searchParams);
                if (debouncedSearchTerm) {
                    newParams.set('searchTerm', debouncedSearchTerm);
                } else {
                    newParams.delete('searchTerm');
                }
                setSearchParams(newParams, { replace: true });
            }
        }
    }, [debouncedSearchTerm, searchFromUrl, settings.routerMode, navigate, searchParams, setSearchParams, selectedCategory]);


    const handleCategorySelect = (categoryId: string | 'All') => {
        const isSameCategory = selectedCategory === categoryId;

        if (isSameCategory && currentPage === 1) {
            return;
        }
    
        setCurrentPage(1);
        if (paginationStyle === 'infiniteScroll') {
            setPosts([]);
        }
    
        if (!isSameCategory) {
            if (settings.routerMode === 'browser') {
                navigate(categoryId === 'All' ? '/posts' : buildUrl('postCategory', { categoryId }));
            } else {
                setSearchParams(categoryId === 'All' ? {} : { category: categoryId }, { replace: true });
            }
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo(0, 0);
    };
    
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(e.target.value);
    };

    const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
    
    const postCategoryCounts = useMemo(() => 
        Object.fromEntries(categories.map(c => [c.id, c.postCount]))
    , [categories]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <main className="lg:col-span-9 space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold">{t('header.posts')}</h1>
                    <div className="mt-4 max-w-lg mx-auto">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={handleSearchChange}
                            placeholder="Search posts by title, tag, or author..."
                            className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"
                        />
                    </div>
                </div>

                <CategoryTabs 
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={handleCategorySelect}
                    totalPrompts={totalPosts}
                    permalinkType="postCategory"
                    basePath="/posts"
                />

                {isLoading && posts.length === 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Array.from({ length: 6 }).map((_, index) => <PostCardSkeleton key={index} />)}
                    </div>
                ) : posts.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {posts.map(post => (
                                <PostCard post={post} key={post.id} categories={categories} />
                            ))}
                        </div>
                        {paginationStyle === 'pagination' && totalPages > 1 && !isLoading && (
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                        )}
                        {paginationStyle === 'infiniteScroll' && hasMore && (
                            <div ref={loaderRef} className="flex justify-center py-8">
                                {isLoading && <Spinner size="md" />}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg">
                        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">No Posts Found</h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">There are no posts matching your search criteria.</p>
                    </div>
                )}
            </main>
            <div className="hidden lg:block lg:col-span-3">
                <RightSidebar categories={categories} />
            </div>
        </div>
    );
};

export default PostsPage;