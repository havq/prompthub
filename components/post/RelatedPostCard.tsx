
import React from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../../utils/types';
import { buildUrl } from '../../utils/permalinks';
import { formatCount } from '../../utils/formatters';

const RelatedPostCard: React.FC<{ post: Post }> = ({ post }) => {
    return (
        <Link to={buildUrl('post', { postId: post.id })} className="group block w-full h-full flex flex-col">
            <div className="aspect-video overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                {post.imageUrl ? (
                    <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                )}
            </div>
            <h3 className="text-sm font-semibold mt-2 text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 line-clamp-2 flex-grow">{post.title}</h3>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                 <p>by {post.authorName || 'Anonymous'}</p>
                 <div className="flex items-center gap-2">
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
        </Link>
    );
};

export default RelatedPostCard;
