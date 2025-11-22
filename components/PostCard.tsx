
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Post, PostCategoryWithCount } from '../types';
import PostCardSkeleton from './PostCardSkeleton';
import { transformCloudinaryUrl } from '../services/cloudinaryUtils';
import ShareButton from './ShareButton';
import { getSettings } from '../services/settingsService';
import { buildUrl } from '../utils/permalinks';
import { sanitizeHtml } from '../utils/sanitize';

const createExcerpt = (htmlContent: string, length: number = 120) => {
    if (!htmlContent) return '';
    // Sanitize first to remove malicious tags, then strip all tags for plain text excerpt
    const sanitized = sanitizeHtml(htmlContent);
    const text = sanitized.replace(/<[^>]*>?/gm, '');
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
};

const formatCount = (count: number | undefined): string => {
    const num = Number(count || 0);
    if (num < 1000) {
      return num.toLocaleString();
    }
    const units = ['k', 'm', 'b', 't'];
    // toFixed(0).length is a trick to get number of digits
    const unit = Math.floor((num.toFixed(0).length - 1) / 3) - 1;
    
    if (unit >= units.length) {
        return num.toLocaleString();
    }
    
    const value = num / Math.pow(1000, unit + 1);
    const truncatedValue = Math.floor(value * 10) / 10;
    
    return String(truncatedValue) + units[unit];
};

const PostCard: React.FC<{ post: Post, categories: PostCategoryWithCount[] }> = ({ post, categories }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);
    const [isMediaReady, setIsMediaReady] = useState(false);
    const [mediaError, setMediaError] = useState(false);

    const optimizedImageUrl = transformCloudinaryUrl(post.imageUrl, 'w_400,c_fill');

    useEffect(() => {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setIsIntersecting(true);
              observer.disconnect();
            }
          },
          { rootMargin: '200px' }
        );
    
        const currentRef = cardRef.current;
        if (currentRef) {
          observer.observe(currentRef);
        }
    
        return () => {
          if (currentRef) {
            observer.unobserve(currentRef);
          }
        };
      }, []);

    useEffect(() => {
        if (isIntersecting) {
            const img = new Image();
            img.src = optimizedImageUrl;
            img.onload = () => setIsMediaReady(true);
            img.onerror = () => setMediaError(true);
        }
    }, [isIntersecting, optimizedImageUrl]);


    const postCategories = useMemo(() => {
        return (post.categoryIds || [])
            .map(id => categories.find(c => c.id === id))
            .filter((c): c is PostCategoryWithCount => c !== undefined);
    }, [post.categoryIds, categories]);

    if (!isMediaReady && !mediaError) {
        return <div ref={cardRef}><PostCardSkeleton /></div>;
    }

    return (
        <Link to={buildUrl('post', { postId: post.id })} ref={cardRef as unknown as React.RefObject<HTMLAnchorElement>} className="group flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            {post.imageUrl && (
                <div className="aspect-video overflow-hidden relative">
                    {mediaError ? (
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                    ) : (
                        <img src={optimizedImageUrl} alt={post.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-2 z-30">
                        <ShareButton
                            post={post}
                            shareText={post.title}
                            className="p-2 rounded-full bg-gray-900/60 text-gray-300 hover:bg-green-600/80 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                            </svg>
                        </ShareButton>
                    </div>
                    {post.status === 'private' && (
                        <div className="absolute top-2 left-2 z-10 bg-gray-800/60 text-white p-1.5 rounded-full backdrop-blur-sm" title="Private Post">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                            </svg>
                        </div>
                    )}
                </div>
            )}
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex flex-wrap gap-2 mb-3">
                    {postCategories.slice(0, 3).map(cat => (
                        <Link
                            key={cat.id}
                            to={buildUrl('postCategory', { categoryId: cat.id })}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/80 transition-colors"
                        >
                            {cat.name}
                        </Link>
                    ))}
                </div>
                <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 line-clamp-2">{post.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-grow line-clamp-3">
                    {createExcerpt(post.content)}
                </p>
                <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                        <img src={post.authorPhotoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(post.authorName || 'A')}`} alt={post.authorName || 'Author'} className="w-7 h-7 rounded-full object-cover"/>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{post.authorName || 'Anonymous'}</span>
                    </div>
                    <div className="flex items-center gap-x-4 text-xs">
                        <div className="flex items-center gap-1" title="Views">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>{formatCount(post.viewCount)}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Comments">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            <span>{formatCount(post.commentCount)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default PostCard;