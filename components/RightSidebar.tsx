import React, { useState, useEffect } from 'react';
import { getPostSidebarData, getPostCategories } from '../services/api';
import { getSettings } from '../services/settingsService';
import { Post, PostCategoryWithCount, AppSettings } from '../types';
import { Link } from 'react-router-dom';
import Spinner from './Spinner';
import BannerAd from './BannerAd';
import { useLanguage } from '../context/LanguageContext';
import { buildUrl } from '../utils/permalinks';

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

const PostListItem: React.FC<{ post: Post }> = ({ post }) => (
    <li className="flex items-start gap-4">
        <Link to={buildUrl('post', { postId: post.id })} className="flex-shrink-0">
            <img src={post.imageUrl} alt={post.title} className="w-16 h-16 object-cover rounded-md" />
        </Link>
        <div>
            <Link to={buildUrl('post', { postId: post.id })} className="text-sm font-semibold text-gray-800 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2">
                {post.title}
            </Link>
            <div className="flex items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                <div className="flex items-center gap-1" title="Views">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    <span>{formatCount(post.viewCount)}</span>
                </div>
                <div className="flex items-center gap-1" title="Comments">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <span>{formatCount(post.commentCount)}</span>
                </div>
             </div>
        </div>
    </li>
);

const PopularPosts: React.FC<{ mostViewed: Post[], mostCommented: Post[] }> = ({ mostViewed, mostCommented }) => {
    const [activeTab, setActiveTab] = useState<'viewed' | 'commented'>('viewed');
    const postsToShow = activeTab === 'viewed' ? mostViewed : mostCommented;

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                <button 
                    onClick={() => setActiveTab('viewed')}
                    className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'viewed' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Most Viewed
                </button>
                <button 
                    onClick={() => setActiveTab('commented')}
                    className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'commented' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Most Commented
                </button>
            </div>
            {postsToShow.length > 0 ? (
                <ul className="space-y-4">
                    {postsToShow.map(post => <PostListItem key={post.id} post={post} />)}
                </ul>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No posts to display.</p>
            )}
        </div>
    );
};

const CategoriesList: React.FC<{ categories: PostCategoryWithCount[] }> = ({ categories }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Categories</h3>
        {categories.length > 0 ? (
            <ul className="space-y-2">
                {categories.filter(c => c.postCount > 0).map(cat => {
                    return (
                        <li key={cat.id}>
                            <Link to={buildUrl('postCategory', { categoryId: cat.id })} className="flex justify-between items-center text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 rounded">
                                <span>{cat.name}</span>
                                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{cat.postCount}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        ) : (
             <p className="text-sm text-gray-500 dark:text-gray-400">No categories available.</p>
        )}
    </div>
);

const TagsList: React.FC<{ tags: string[] }> = ({ tags }) => {
    const { t } = useLanguage();
    const TAGS_LIMIT = 30;
    const [isExpanded, setIsExpanded] = useState(false);

    const tagsToShow = isExpanded ? tags : tags.slice(0, TAGS_LIMIT);

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Tags</h3>
            {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2 items-center">
                    {tagsToShow.map(tag => {
                        return (
                            <Link key={tag} to={buildUrl('tag', { tag: tag })} className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-200 dark:hover:bg-indigo-600 transition-colors">
                                #{tag}
                            </Link>
                        );
                    })}
                    {tags.length > TAGS_LIMIT && (
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)} 
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            {isExpanded ? t('common.showLess') : t('common.showMore', { count: tags.length - TAGS_LIMIT })}
                        </button>
                    )}
                </div>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No tags available.</p>
            )}
        </div>
    );
};

interface RightSidebarProps {
    categories?: PostCategoryWithCount[];
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ categories: initialCategories }) => {
    const { t } = useLanguage();
    const [mostViewed, setMostViewed] = useState<Post[]>([]);
    const [mostCommented, setMostCommented] = useState<Post[]>([]);
    const [categories, setCategories] = useState<PostCategoryWithCount[]>(initialCategories || []);
    const [tags, setTags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const settings = getSettings();
    const { sidebarTopAdSettings, sidebarBottomAdSettings } = settings;
    
    useEffect(() => {
        if (initialCategories) {
            setCategories(initialCategories);
        }
    }, [initialCategories]);

    // Load Sidebar Data (Views, Comments, Tags) - Run once on mount
    useEffect(() => {
        const fetchSidebarData = async () => {
            setIsLoading(true);
            try {
                const sidebarData = await getPostSidebarData();
                setMostViewed(sidebarData.mostViewed);
                setMostCommented(sidebarData.mostCommented);
                setTags(sidebarData.tags);
            } catch (error) {
                console.error("Failed to fetch sidebar data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSidebarData();
    }, []);

    // Load Categories if not provided by parent (Fallback) - Run once on mount
    useEffect(() => {
        if (initialCategories === undefined) {
            const fetchCategories = async () => {
                try {
                    const cats = await getPostCategories();
                    setCategories(cats);
                } catch (err) {
                    console.error("Failed to fetch categories:", err);
                }
            };
            fetchCategories();
        }
    }, []);

    if (isLoading) {
        return (
            <aside className="space-y-6 animate-pulse">
                {/* Popular Posts Skeleton */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                        <div className="py-2 px-4 h-9 w-28 bg-gray-300 dark:bg-gray-700 rounded-t-md"></div>
                        <div className="py-2 px-4 h-9 w-32 bg-gray-200 dark:bg-gray-600 rounded-t-md ml-2"></div>
                    </div>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <div className="w-16 h-16 bg-gray-300 dark:bg-gray-700 rounded-md"></div>
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Categories Skeleton */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
                        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                    </div>
                </div>
                {/* Tags Skeleton */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                    <div className="flex flex-wrap gap-2">
                        <div className="h-5 w-16 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                        <div className="h-5 w-20 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                        <div className="h-5 w-12 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                        <div className="h-5 w-24 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                        <div className="h-5 w-16 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                    </div>
                </div>
            </aside>
        );
    }

    return (
        <aside className="space-y-6">
            {sidebarTopAdSettings?.enabled && sidebarTopAdSettings.adCode && <BannerAd adCode={sidebarTopAdSettings.adCode} />}
            <PopularPosts mostViewed={mostViewed} mostCommented={mostCommented} />
            <CategoriesList categories={categories} />
            <TagsList tags={tags} />
            {sidebarBottomAdSettings?.enabled && sidebarBottomAdSettings.adCode && <BannerAd adCode={sidebarBottomAdSettings.adCode} />}
        </aside>
    );
};