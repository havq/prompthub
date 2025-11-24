
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Reel, ReelComment, UserProfile } from '../utils/types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getReelComments, addReelComment, deleteReelComment, updateReelComment, getAllUsers } from '../services/api';
import Spinner from './Spinner';
import { Link } from 'react-router-dom';
import ConfirmModal from './ConfirmModal';
import { getSettings } from '../services/settingsService';
import { commentRateLimiter, formatTimeAgo } from './PromptDetail/utils';
import Pagination from './Pagination';
import MentionInput from './MentionInput';
import { renderTextWithMentions } from '../utils/textFormatting';

interface CommentsModalProps {
    reel: Reel;
    onClose: () => void;
    onCommentCountChange: (change: number) => void;
    highlightCommentId?: string;
}

const ReelCommentItem: React.FC<{
    comment: ReelComment;
    onReplyClick: (commentId: string | null) => void;
    onDelete: (comment: ReelComment) => void;
    onCloseModal: () => void;
    replyingTo: string | null;
    onPostReply: (text: string, parentId: string) => Promise<void>;
    onRefresh: () => void;
    allUsers: UserProfile[];
    highlightCommentId?: string;
}> = ({ comment, onReplyClick, onDelete, onCloseModal, replyingTo, onPostReply, onRefresh, allUsers, highlightCommentId }) => {
    const { currentUser, isAdmin } = useAuth();
    const { t } = useLanguage();
    
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(comment.text);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const [replyText, setReplyText] = useState('');
    const [isPostingReply, setIsPostingReply] = useState(false);
    const isReplying = replyingTo === comment.id;
    const itemRef = useRef<HTMLLIElement>(null);
    
    const isHighlighted = highlightCommentId === comment.id;

    useEffect(() => {
        if (isHighlighted && itemRef.current) {
            itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [isHighlighted]);

    const handleSaveEdit = async () => {
        if (!currentUser || !editedText.trim() || editedText === comment.text) {
            setIsEditing(false);
            return;
        }
        setIsSavingEdit(true);
        try {
            await updateReelComment(comment.id, currentUser.uid, editedText);
            setIsEditing(false);
            onRefresh();
        } catch (error) {
            console.error("Failed to update reel comment:", error);
            alert("Could not update comment. You may not have permission.");
        } finally {
            setIsSavingEdit(false);
        }
    };
    
    const submitReply = async () => {
        if (!replyText.trim()) return;
        setIsPostingReply(true);
        try {
            await onPostReply(replyText, comment.id);
            setReplyText('');
            onReplyClick(null);
        } finally {
            setIsPostingReply(false);
        }
    };

    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        submitReply();
    };

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit();
        }
    };

    const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitReply();
        }
    };
    
    const canManage = currentUser?.uid === comment.userId || isAdmin;

    return (
        <li ref={itemRef} className={`flex items-start space-x-3 p-2 rounded-md transition-colors ${isHighlighted ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
            <Link to={`/author/${comment.userId}`} onClick={onCloseModal}>
                <img src={comment.userPhotoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(comment.username)}`} alt={comment.username} className="h-9 w-9 rounded-full" />
            </Link>
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <p className="text-sm">
                        <Link to={`/author/${comment.userId}`} onClick={onCloseModal} className="font-medium text-gray-900 dark:text-white hover:underline">{comment.username}</Link>
                        <time className="ml-2 text-xs text-gray-500 dark:text-gray-400" dateTime={comment.createdAt}>{formatTimeAgo(comment.createdAt, t)}</time>
                        {comment.updatedAt && new Date(comment.updatedAt) > new Date(comment.createdAt) && (
                           <span className="text-xs text-gray-400 dark:text-gray-500 italic ml-2">(edited)</span>
                        )}
                    </p>
                </div>

                {isEditing ? (
                     <div className="mt-2 space-y-2">
                        <MentionInput
                            value={editedText}
                            onChange={setEditedText}
                            users={allUsers}
                            onKeyDown={handleEditKeyDown}
                            className="block w-full p-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-gray-100 dark:bg-gray-700 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm resize-none"
                        />
                        <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-600">Cancel</button>
                            <button onClick={handleSaveEdit} disabled={isSavingEdit} className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 w-20 flex justify-center">
                                {isSavingEdit ? <Spinner size="sm"/> : 'Save'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{renderTextWithMentions(comment.text)}</p>
                        <div className="mt-2 flex items-center space-x-4">
                            {currentUser && (
                                <button onClick={() => onReplyClick(isReplying ? null : comment.id)} className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
                                    {isReplying ? 'Cancel' : 'Reply'}
                                </button>
                            )}
                             {canManage && (
                                <>
                                    <button onClick={() => setIsEditing(true)} className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">Edit</button>
                                    <button onClick={() => onDelete(comment)} className="text-xs font-semibold text-red-500 hover:text-red-700">Delete</button>
                                </>
                            )}
                        </div>
                    </>
                )}

                {isReplying && (
                    <form onSubmit={handleReplySubmit} className="mt-2 flex items-center space-x-2">
                         <div className="flex-1">
                            <MentionInput
                                value={replyText}
                                onChange={setReplyText}
                                users={allUsers}
                                onKeyDown={handleReplyKeyDown}
                                placeholder={`Replying to ${comment.username}...`}
                                className="block w-full px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm resize-none"
                            />
                         </div>
                        <button type="submit" disabled={isPostingReply || !replyText.trim()} className="text-indigo-600 dark:text-indigo-400 font-semibold disabled:opacity-50 text-sm">
                            {isPostingReply ? <Spinner size="sm" /> : 'Post'}
                        </button>
                    </form>
                )}

                {comment.replies && comment.replies.length > 0 && (
                    <ul className="space-y-4 mt-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                        {(comment.replies as ReelComment[]).map(reply => (
                            <ReelCommentItem 
                                key={reply.id} 
                                comment={reply} 
                                onReplyClick={onReplyClick}
                                onDelete={onDelete}
                                onCloseModal={onCloseModal}
                                replyingTo={replyingTo}
                                onPostReply={onPostReply}
                                onRefresh={onRefresh}
                                allUsers={allUsers}
                                highlightCommentId={highlightCommentId}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </li>
    );
};


const CommentsModal: React.FC<CommentsModalProps> = ({ reel, onClose, onCommentCountChange, highlightCommentId }) => {
    const { currentUser, userProfile } = useAuth();
    const { t } = useLanguage();
    const [comments, setComments] = useState<ReelComment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [commentError, setCommentError] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    
    const [countdown, setCountdown] = useState(0);
    const intervalRef = useRef<number | null>(null);

    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [deletingComment, setDeletingComment] = useState<ReelComment | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const sortDropdownRef = useRef<HTMLDivElement>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const { commentsPerPage } = getSettings();
    const COMMENTS_PER_PAGE = commentsPerPage || 10;

    useEffect(() => {
        if (currentUser) {
            getAllUsers().then(setAllUsers).catch(err => console.error("Failed to fetch users for mentions", err));
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
    
    const fetchComments = useCallback(async () => {
        setIsLoading(true);
        try {
            const commentsData = await getReelComments(reel.id);
            setComments(commentsData.comments);
        } catch (error) {
            console.error("Failed to fetch reel comments:", error);
        } finally {
            setIsLoading(false);
        }
    }, [reel.id]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

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
        const sorted = [...comments]; // Create a new array to avoid mutating state
        if (sortOrder === 'newest') {
            sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else { // 'oldest'
            sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        return sorted;
    }, [comments, sortOrder]);

    // Logic to find the page of the highlighted comment
    useEffect(() => {
        if (highlightCommentId && sortedComments.length > 0) {
            const index = sortedComments.findIndex(c => c.id === highlightCommentId || c.replies?.some(r => r.id === highlightCommentId));
            if (index !== -1) {
                const page = Math.ceil((index + 1) / COMMENTS_PER_PAGE);
                setCurrentPage(page);
            }
        }
    }, [highlightCommentId, sortedComments, COMMENTS_PER_PAGE]);

    const paginatedComments = useMemo(() => {
        const startIndex = (currentPage - 1) * COMMENTS_PER_PAGE;
        return sortedComments.slice(startIndex, startIndex + COMMENTS_PER_PAGE);
    }, [sortedComments, currentPage, COMMENTS_PER_PAGE]);

    const totalPages = Math.ceil(sortedComments.length / COMMENTS_PER_PAGE);

    const handleSortChange = (order: 'newest' | 'oldest') => {
        setSortOrder(order);
        setCurrentPage(1);
        setIsSortDropdownOpen(false);
    };

    const handlePostComment = async (text: string, parentId: string | null) => {
        if (!text.trim() || !currentUser || !userProfile) return;
        
        const { commentCooldownSeconds, commentRateLimitSeconds } = getSettings();
        
        // Prevent action if a hard limit countdown is already active
        if (countdown > 0) {
            return;
        }
        
        const lastPostTime = commentRateLimiter.lastReelCommentTime;
        const secondsPassed = (Date.now() - lastPostTime) / 1000;

        // If user posts within the grace period, start the hard limit countdown
        if (lastPostTime > 0 && (commentCooldownSeconds || 0) > 0 && secondsPassed < (commentCooldownSeconds || 0)) {
            setCountdown(commentRateLimitSeconds || 30);
            return; // Block the post
        }

        setIsPosting(true);
        try {
            await addReelComment({
                reelId: reel.id,
                text,
                userId: currentUser.uid,
                username: userProfile.username,
                userPhotoURL: userProfile.photoURL,
                parentId,
            });
            if (!parentId) {
                setNewComment('');
                setCurrentPage(1); // Go to first page on new root comment
            }
            commentRateLimiter.lastReelCommentTime = Date.now();
            setCommentError('');
            fetchComments();
            onCommentCountChange(1);
        } catch (error: any) {
            console.error("Failed to post comment:", error);
            setCommentError(error.message || 'Failed to post comment.');
        } finally {
            setIsPosting(false);
        }
    };

    const handleDeleteComment = async () => {
        if (!deletingComment || !currentUser) return;
        setIsDeleting(true);
        try {
            const result = await deleteReelComment(deletingComment.id, currentUser.uid);
            onCommentCountChange(-result.deletedCount);
            await fetchComments();
            
            // Adjust page if current page becomes empty
            const newTotalComments = comments.length - result.deletedCount;
            const newTotalPages = Math.ceil(newTotalComments / COMMENTS_PER_PAGE);
            if (currentPage > newTotalPages) {
                setCurrentPage(Math.max(1, newTotalPages));
            }
        } catch (error) {
            console.error("Failed to delete comment:", error);
            alert("Could not delete comment. You may not have permission.");
        } finally {
            setIsDeleting(false);
            setDeletingComment(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handlePostComment(newComment, null);
        }
    };

    const CountdownDisplay = ({ secondsLeft }: { secondsLeft: number }) => {
        const { commentRateLimitSeconds } = getSettings();
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

    return (
        <>
        {deletingComment && <ConfirmModal isOpen={!!deletingComment} onClose={() => setDeletingComment(null)} onConfirm={handleDeleteComment} title={t('common.delete')} message={t('promptDetail.deleteCommentConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isDeleting} />}
        <div className="fixed inset-0 bg-black/50 z-30 flex items-end" onClick={onClose} role="dialog" aria-modal="true">
            <div 
                className="bg-white dark:bg-gray-800 w-full h-[60vh] rounded-t-2xl shadow-xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white">Comments ({reel.commentCount})</h3>
                </div>

                <div className="flex-grow overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full"><Spinner /></div>
                    ) : comments.length > 0 ? (
                        <>
                            <div className="flex justify-end mb-4">
                                <div className="relative" ref={sortDropdownRef}>
                                    <button onClick={() => setIsSortDropdownOpen(p => !p)} className="flex items-center gap-1 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                        {t(sortOrder === 'newest' ? 'filters.newest' : 'filters.oldest')}
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
                                    <ReelCommentItem
                                        key={comment.id}
                                        comment={comment}
                                        onReplyClick={setReplyingTo}
                                        onDelete={setDeletingComment}
                                        onCloseModal={onClose}
                                        replyingTo={replyingTo}
                                        onPostReply={handlePostComment}
                                        onRefresh={fetchComments}
                                        allUsers={allUsers}
                                        highlightCommentId={highlightCommentId}
                                    />
                               ))}
                            </ul>
                             {totalPages > 1 && (
                                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-8">{t('promptDetail.noComments')}</p>
                    )}
                </div>

                {currentUser && userProfile ? (
                     <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                        {countdown > 0 ? (
                            <CountdownDisplay secondsLeft={countdown} />
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); handlePostComment(newComment, null); }} className="flex items-start space-x-3">
                                <img src={userProfile.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userProfile.username)}`} alt="Your avatar" className="h-9 w-9 rounded-full"/>
                                <div className="flex-1">
                                    <MentionInput 
                                        value={newComment}
                                        onChange={(val) => { setNewComment(val); setCommentError(''); }}
                                        onKeyDown={handleKeyDown}
                                        users={allUsers}
                                        placeholder="Add a comment..."
                                        className="block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm resize-none"
                                    />
                                    {commentError && <p className="text-xs text-red-500 dark:text-red-400 mt-1 pl-2">{commentError}</p>}
                                </div>
                                <button type="submit" disabled={isPosting || !newComment.trim()} className="text-indigo-600 dark:text-indigo-400 font-semibold disabled:opacity-50">
                                    Post
                                </button>
                            </form>
                        )}
                    </div>
                ) : (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                        <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Log in</Link> to add a comment.
                    </div>
                )}
            </div>
        </div>
        </>
    );
};

export default CommentsModal;
