
import { useState, useEffect, useCallback, useRef } from 'react';
import { getPost, getPostComments, addPostComment, deletePostComment, getUserProfile, getPosts, incrementPostViewCount, getPostCategories, getAllUsers } from '../services/api';
import { Post, PostComment, UserProfile, PostCategoryWithCount } from '../types';
import { useAuth } from '../context/AuthContext';
import { getSettings } from '../services/settingsService';
import { commentRateLimiter } from '../components/PromptDetail/utils';

export const usePostDetail = (postId: string | undefined) => {
    const [post, setPost] = useState<Post | null>(null);
    const [categories, setCategories] = useState<PostCategoryWithCount[]>([]);
    const [comments, setComments] = useState<PostComment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);
    const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

    // Comment states
    const [newComment, setNewComment] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [commentError, setCommentError] = useState('');
    const [countdown, setCountdown] = useState(0);
    const intervalRef = useRef<number | null>(null);

    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [deletingComment, setDeletingComment] = useState<PostComment | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { currentUser, userProfile, isAdmin } = useAuth();
    const { commentsPerPage, relatedPostsCount, commentsGloballyEnabled } = getSettings();
    const RELATED_POSTS_COUNT = relatedPostsCount || 5;
    const COMMENTS_PER_PAGE = commentsPerPage || 10;

    // Countdown timer logic
    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (countdown > 0) {
            intervalRef.current = window.setInterval(() => {
                setCountdown(prev => (prev <= 1 ? 0 : prev - 1));
            }, 1000);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [countdown]);

    const fetchComments = useCallback(async () => {
        if (!postId) return;
        try {
            const commentsData = await getPostComments(postId);
            setComments(commentsData);
        } catch (error) {
            console.error("Failed to fetch post comments:", error);
        }
    }, [postId]);

    const fetchPostData = useCallback(async () => {
        if (!postId) return;
        setIsLoading(true);
        setError('');
        incrementPostViewCount(postId).catch(err => console.error("Failed to increment view count", err));

        try {
            const [postData, categoriesData] = await Promise.all([
                getPost(postId),
                getPostCategories()
            ]);

            setPost(postData);
            setCategories(categoriesData);

            if (postData) {
                const authorPromise = postData.authorId ? getUserProfile(postData.authorId) : Promise.resolve(null);
                const relatedPostsPromise = postData.categoryIds?.length > 0
                    ? getPosts({ page: 1, limit: RELATED_POSTS_COUNT + 1, sortBy: 'newest', category: postData.categoryIds[0] })
                    : Promise.resolve({ posts: [], total: 0 });

                const [authorData, relatedData] = await Promise.all([authorPromise, relatedPostsPromise]);

                setAuthorProfile(authorData);
                setRelatedPosts(relatedData.posts.filter(p => p.id !== postData.id).slice(0, RELATED_POSTS_COUNT));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load post.');
        } finally {
            setIsLoading(false);
        }
    }, [postId, RELATED_POSTS_COUNT]);

    useEffect(() => {
        fetchPostData();
        fetchComments();
        if (currentUser) {
            getAllUsers().then(setAllUsers).catch(err => console.error("Failed to fetch users", err));
        }
    }, [fetchPostData, fetchComments, currentUser]);


    const handlePostComment = async (text: string, parentId: string | null) => {
        if (!text.trim() || !currentUser || !userProfile || !postId) return;
        const { commentCooldownSeconds, commentRateLimitSeconds } = getSettings();
        if (countdown > 0) return;

        const lastPostTime = commentRateLimiter.lastPostCommentTime;
        const secondsPassed = (Date.now() - lastPostTime) / 1000;
        if (lastPostTime > 0 && (commentCooldownSeconds || 0) > 0 && secondsPassed < (commentCooldownSeconds || 0)) {
            setCountdown(commentRateLimitSeconds || 30);
            return;
        }

        setIsPosting(true);
        try {
            await addPostComment({ 
                postId, 
                text, 
                userId: currentUser.uid, 
                username: userProfile.username, 
                userPhotoURL: userProfile.photoURL || '',
                parentId 
            });
            if (!parentId) {
                setNewComment('');
            }
            commentRateLimiter.lastPostCommentTime = Date.now();
            setCommentError('');
            
            await fetchComments();
            setPost(prev => prev ? { ...prev, commentCount: (prev.commentCount || 0) + 1 } : null);
        } catch (error: any) {
            setCommentError(error.message || 'Failed to post comment.');
        } finally {
            setIsPosting(false);
        }
    };

    const handleDeleteComment = async () => {
        if (!deletingComment || !currentUser || !postId) return;
        setIsDeleting(true);
        try {
            const result = await deletePostComment(deletingComment.id, currentUser.uid);
            setPost(prev => prev ? { ...prev, commentCount: Math.max(0, (prev.commentCount || 0) - result.deletedCount) } : null);
            await fetchComments();
        } catch (error) {
            alert("Could not delete comment.");
        } finally {
            setIsDeleting(false);
            setDeletingComment(null);
        }
    };

    return {
        post, categories, comments, isLoading, error, authorProfile, relatedPosts,
        newComment, setNewComment, isPosting, commentError, countdown,
        replyingTo, setReplyingTo, deletingComment, setDeletingComment, isDeleting,
        currentUser, userProfile, isAdmin, allUsers,
        handlePostComment, handleDeleteComment, fetchComments,
        COMMENTS_PER_PAGE, commentsGloballyEnabled
    };
};
