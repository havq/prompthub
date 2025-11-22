
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import Spinner from '../Spinner';
import CommentItem from './CommentItem';
import Pagination from '../Pagination';
import { AppSettings, Comment, UserProfile, Prompt } from '../../types';
import { commentRateLimiter } from './utils';
import MentionInput from '../MentionInput';
import { getAllUsers } from '../../services/api';

interface CommentsTabProps {
    prompt: Prompt;
    comments: Comment[];
    isLoadingComments: boolean;
    canComment: boolean;
    currentUser: any;
    userProfile: UserProfile | null;
    onPostComment: (text: string, parentId: string | null) => Promise<void>;
    onDeleteComment: (comment: Comment) => void;
    onRefresh: () => void;
    onClose: () => void;
    settings: AppSettings;
}

const CommentsTab: React.FC<CommentsTabProps> = ({
    prompt,
    comments,
    isLoadingComments,
    canComment,
    currentUser,
    userProfile,
    onPostComment,
    onDeleteComment,
    onRefresh,
    onClose,
    settings
}) => {
    const { t } = useLanguage();
    const [newComment, setNewComment] = useState('');
    const [commentError, setCommentError] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [commentSortOrder, setCommentSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const sortDropdownRef = useRef<HTMLDivElement>(null);
    const [commentsPage, setCommentsPage] = useState(1);
    const [countdown, setCountdown] = useState(0);
    const intervalRef = useRef<number | null>(null);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

    const COMMENTS_PER_PAGE = settings.commentsPerPage || 10;

    useEffect(() => {
        // Fetch all users for mentions. 
        // In a real app with many users, we should fetch this lazily or search via API in MentionInput.
        // For now, fetching all is consistent with other parts of the app.
        if (currentUser) {
            getAllUsers().then(setAllUsers).catch(err => console.error("Failed to load users for mentions", err));
        }
    }, [currentUser]);

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (countdown > 0) {
            intervalRef.current = window.setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        if (intervalRef.current) clearInterval(intervalRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [countdown]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
                setIsSortDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const sortedComments = useMemo(() => {
        const sorted = [...comments];
        if (commentSortOrder === 'newest') {
            sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else {
            sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        return sorted;
    }, [comments, commentSortOrder]);

    const paginatedComments = useMemo(() => {
        const startIndex = (commentsPage - 1) * COMMENTS_PER_PAGE;
        return sortedComments.slice(startIndex, startIndex + COMMENTS_PER_PAGE);
    }, [sortedComments, commentsPage, COMMENTS_PER_PAGE]);

    const totalCommentPages = Math.ceil(sortedComments.length / COMMENTS_PER_PAGE);

    const handleSortChange = (order: 'newest' | 'oldest') => {
        setCommentSortOrder(order);
        setCommentsPage(1);
        setIsSortDropdownOpen(false);
    };

    const handleCommentSubmit = async (text: string, parentId: string | null = null) => {
        if (!text.trim() || !currentUser || !userProfile) return;

        const { commentCooldownSeconds, commentRateLimitSeconds } = settings;

        if (countdown > 0) {
            return;
        }

        const lastPostTime = commentRateLimiter.lastPromptCommentTime;
        const secondsPassed = (Date.now() - lastPostTime) / 1000;
        
        if (lastPostTime > 0 && (commentCooldownSeconds || 0) > 0 && secondsPassed < (commentCooldownSeconds || 0)) {
            setCountdown(commentRateLimitSeconds || 30);
            return; 
        }

        setIsPostingComment(true);
        try {
            await onPostComment(text, parentId);
            if (!parentId) {
                setNewComment('');
                setCommentsPage(1); // Go to first page for new root comments
            }
            commentRateLimiter.lastPromptCommentTime = Date.now();
            setCommentError('');
        } catch (error: any) {
            console.error("Failed to post comment:", error);
            setCommentError(error.message || 'Failed to post comment.');
        } finally {
            setIsPostingComment(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCommentSubmit(newComment, null);
        }
    };

    const CountdownDisplay = ({ secondsLeft }: { secondsLeft: number }) => {
        const { commentRateLimitSeconds } = settings;
        const totalSeconds = commentRateLimitSeconds || 30;
        const progress = (secondsLeft / totalSeconds) * 100;
        
        return (
            <div className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                    <div 
                        className="bg-indigo-600 h-2.5 rounded-full" 
                        style={{ width: `${100 - progress}%`, transition: 'width 1s linear' }}
                    ></div>
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('modals.commentRateLimitError', { timeLeft: secondsLeft })}
                </p>
            </div>
        );
    };

    if (isLoadingComments) {
        return <div className="flex justify-center"><Spinner /></div>;
    }

    return (
        <div className="space-y-6">
            {canComment ? (
                currentUser ? (
                    countdown > 0 ? (
                        <CountdownDisplay secondsLeft={countdown} />
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleCommentSubmit(newComment, null); }} className="flex items-start space-x-4">
                            <img src={userProfile?.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userProfile?.username || 'G')}`} alt="Your avatar" className="h-10 w-10 rounded-full"/>
                            <div className="flex-1">
                                <MentionInput 
                                    value={newComment}
                                    onChange={(val) => { setNewComment(val); setCommentError(''); }}
                                    onKeyDown={handleKeyDown}
                                    users={allUsers}
                                    maxLength={settings.commentCharacterLimit || 500}
                                    placeholder={t('promptDetail.addCommentPlaceholder')}
                                    className="block w-full p-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-gray-100 dark:bg-gray-700 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm resize-none"
                                />
                                <div className="mt-2 flex justify-between items-center">
                                    <p className="text-xs text-red-500 dark:text-red-400">{commentError}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{settings.commentCharacterLimit ? `${newComment.length} / ${settings.commentCharacterLimit}` : ''}</p>
                                    <button type="submit" disabled={isPostingComment || !newComment.trim() || !!commentError} className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 w-28">
                                        {isPostingComment ? <Spinner size="sm"/> : t('promptDetail.postComment')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )
                ) : (<p className="text-center text-sm text-gray-500 dark:text-gray-400">{t('promptDetail.loginToComment')}</p>)
            ) : (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">{t(prompt.commentsEnabled ? 'promptDetail.commentsDisabledGlobal' : 'promptDetail.commentsDisabled')}</p>
            )}
            {sortedComments.length > 0 ? (
                <>
                    <div className="flex justify-end">
                        <div className="relative" ref={sortDropdownRef}>
                            <button onClick={() => setIsSortDropdownOpen(p => !p)} className="flex items-center gap-1 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                {t(commentSortOrder === 'newest' ? 'filters.newest' : 'filters.oldest')}
                                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                            {isSortDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 ring-1 ring-black ring-opacity-5">
                                    <button onClick={() => handleSortChange('newest')} className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">{t('filters.newest')}</button>
                                    <button onClick={() => handleSortChange('oldest')} className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">{t('filters.oldest')}</button>
                                </div>
                            )}
                        </div>
                    </div>
                    <ul className="space-y-6">
                        {paginatedComments.map(comment => (
                            <CommentItem
                                key={comment.id}
                                comment={comment}
                                onStartDelete={onDeleteComment}
                                onRefresh={onRefresh}
                                onCloseModal={onClose}
                                replyingTo={replyingTo}
                                onReplyClick={setReplyingTo}
                                onPostReply={handleCommentSubmit}
                                canComment={canComment}
                                allUsers={allUsers}
                            />
                        ))}
                    </ul>
                    {totalCommentPages > 1 && (
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Pagination
                                currentPage={commentsPage}
                                totalPages={totalCommentPages}
                                onPageChange={setCommentsPage}
                            />
                        </div>
                    )}
                </>
            ) : (!canComment ? null : <p className="text-center text-sm text-gray-500 dark:text-gray-400">{t('promptDetail.noComments')}</p>)}
        </div>
    );
};

export default CommentsTab;
