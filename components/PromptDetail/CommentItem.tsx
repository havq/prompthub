
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { updateComment } from '../../services/api';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import { buildUrl } from '../../utils/permalinks';
import Spinner from '../Spinner';
import { Comment, UserProfile } from '../../utils/types';
import { formatTimeAgo } from './utils';
import { renderTextWithMentions } from '../../utils/textFormatting';
import MentionInput from '../MentionInput';

interface CommentItemProps {
    comment: Comment;
    onStartDelete: (comment: Comment) => void;
    onRefresh: () => void;
    onCloseModal: () => void;
    replyingTo: string | null;
    onReplyClick: (commentId: string | null) => void;
    onPostReply: (text: string, parentId: string | null) => Promise<void>;
    canComment?: boolean;
    allUsers?: UserProfile[];
}

const CommentItem: React.FC<CommentItemProps> = ({ 
    comment, onStartDelete, onRefresh, onCloseModal, replyingTo, onReplyClick, onPostReply, 
    canComment = true, allUsers = [] 
}) => {
    const { currentUser, isAdmin } = useAuth();
    const { t } = useLanguage();
    
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(comment.text);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const [replyText, setReplyText] = useState('');
    const [isPostingReply, setIsPostingReply] = useState(false);
    const isReplying = replyingTo === comment.id;

    const handleSaveEdit = async () => {
        if (!currentUser || !editedText.trim() || editedText === comment.text) {
            setIsEditing(false);
            return;
        }
        setIsSavingEdit(true);
        try {
            await updateComment(comment.id, currentUser.uid, editedText);
            setIsEditing(false);
            onRefresh();
        } catch (error) {
            console.error("Failed to update comment:", error);
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
            onReplyClick(null); // Close the form
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
        <li className="flex items-start space-x-3">
            <Link to={buildUrl('author', { authorId: comment.userId })} onClick={onCloseModal}>
                <img src={transformCloudinaryUrl(comment.userPhotoURL || '', 'w_100,h_150,c_fill,g_auto') || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(comment.username)}`} alt={comment.username} className="h-9 w-9 rounded-full" />
            </Link>
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div>
                        <Link to={buildUrl('author', { authorId: comment.userId })} onClick={onCloseModal} className="text-sm font-medium text-gray-900 dark:text-white hover:underline">{comment.username}</Link>
                        <time className="ml-2 text-xs text-gray-500 dark:text-gray-400" dateTime={comment.createdAt}>{formatTimeAgo(comment.createdAt, t)}</time>
                        {comment.updatedAt && new Date(comment.updatedAt) > new Date(comment.createdAt) && (
                           <span className="text-xs text-gray-400 dark:text-gray-500 italic ml-2">(edited)</span>
                        )}
                    </div>
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
                            {currentUser && canComment && (
                                <button onClick={() => onReplyClick(isReplying ? null : comment.id)} className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
                                    {isReplying ? 'Cancel' : 'Reply'}
                                </button>
                            )}
                            {canManage && (
                                <>
                                    {canComment && <button onClick={() => setIsEditing(true)} className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">Edit</button>}
                                    <button onClick={() => onStartDelete(comment)} className="text-xs font-semibold text-red-500 hover:text-red-700">Delete</button>
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
                        {comment.replies.map(reply => (
                            <CommentItem 
                                key={reply.id} 
                                comment={reply} 
                                onStartDelete={onStartDelete}
                                onRefresh={onRefresh}
                                onCloseModal={onCloseModal}
                                replyingTo={replyingTo}
                                onReplyClick={onReplyClick}
                                onPostReply={onPostReply}
                                canComment={canComment}
                                allUsers={allUsers}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </li>
    );
};

export default CommentItem;