
import React, { useEffect, useState, useRef } from 'react';
import { NewCommentsWidgetData, Comment } from '../../utils/types';
import { getAllComments, getPrompt } from '../../services/api';
import { Link } from 'react-router-dom';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import { formatTimeAgo } from '../../utils/formatters';
import { useLanguage } from '../../context/LanguageContext';
import { buildUrl } from '../../utils/permalinks';
import Spinner from '../Spinner';

const NewCommentsListWidget: React.FC<{ data: NewCommentsWidgetData }> = ({ data }) => {
    const [comments, setComments] = useState<(Comment & { promptTitle?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const isMounted = useRef(true);
    const { t } = useLanguage();

    useEffect(() => {
        isMounted.current = true;
        const fetchData = async () => {
            setLoading(true);
            try {
                const allComments = await getAllComments();
                
                if (!isMounted.current) return;

                const recentComments = allComments.slice(0, data.limit || 5);
                
                // Get unique prompt IDs, robustly filtering
                const promptIds = [...new Set(recentComments.map(c => c.promptId).filter(id => {
                     if (!id) return false;
                     const strId = String(id);
                     return !strId.includes('{') && strId !== 'undefined';
                }))];
                
                // Fetch prompt titles individually, gracefully handling failures
                const promptPromises = promptIds.map(id => 
                    getPrompt(String(id)).catch(err => null)
                );
                const prompts = await Promise.all(promptPromises);
                
                if (!isMounted.current) return;

                const promptMap = new Map();
                prompts.forEach(p => {
                    if(p) promptMap.set(p.id, p.title);
                });
                
                // Filter out comments where prompt details could not be fetched (deleted prompts)
                const enriched = recentComments.reduce<(Comment & { promptTitle?: string })[]>((acc, c) => {
                    const title = promptMap.get(String(c.promptId) || '');
                    if (title) { 
                         acc.push({
                            ...c,
                            promptTitle: title
                        });
                    }
                    return acc;
                }, []);

                setComments(enriched);
            } catch (e) {
                console.error("Failed to load new comments widget", e);
            } finally {
                if (isMounted.current) setLoading(false);
            }
        };
        fetchData();
        return () => { isMounted.current = false; };
    }, [data.limit]);

    return (
        <div className="h-full">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-800 pb-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-500"><path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" /></svg>
                <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-white">{data.title}</h3>
            </div>
            {loading ? (
                <div className="flex justify-center py-10"><Spinner size="sm" /></div>
            ) : (
                <div className="space-y-3">
                    {comments.map(comment => (
                        <div key={comment.id} className="flex gap-3 bg-gray-50 dark:bg-[#1e2128] p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors group shadow-sm dark:shadow-none">
                            <Link to={`/author/${comment.userId}`} className="flex-shrink-0">
                                <img 
                                    src={transformCloudinaryUrl(comment.userPhotoURL || '', 'w_50,h_50,c_fill')} 
                                    className="w-9 h-9 rounded-full object-cover border border-gray-300 dark:border-gray-600 group-hover:border-gray-400 transition-colors" 
                                    alt={comment.username} 
                                    loading="lazy"
                                    decoding="async"
                                />
                            </Link>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between mb-0.5">
                                    <Link to={`/author/${comment.userId}`} className="text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-yellow-600 dark:hover:text-yellow-500 truncate mr-2">{comment.username}</Link>
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap">{formatTimeAgo(comment.createdAt, t)}</span>
                                </div>
                                <p className="text-[10px] text-gray-600 dark:text-gray-500 mb-1 flex items-center gap-1 truncate">
                                    ▶ <Link to={buildUrl('prompt', { promptId: comment.promptId || '' })} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer truncate hover:underline">{comment.promptTitle}</Link>
                                </p>
                                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{comment.text}</p>
                            </div>
                        </div>
                    ))}
                    {comments.length === 0 && <p className="text-center text-xs text-gray-500 py-2">No comments available.</p>}
                </div>
            )}
        </div>
    );
};

export default NewCommentsListWidget;
