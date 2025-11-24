import { useState, useEffect, useCallback } from 'react';
import { getCommentsForPrompt, addComment, deleteComment, getShowcaseImagesForPrompt, addShowcaseImage, deleteShowcaseImage as apiDeleteShowcaseImage, getUserProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Comment, ShowcaseImage, UserProfile } from '../utils/types';

export const usePromptDetailData = (promptId: string, onCommentUpdate: (id: string, change: number) => void, onShowcaseUpdate?: (id: string, change: number) => void) => {
    const { currentUser, userProfile } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(true);
    const [showcaseImages, setShowcaseImages] = useState<ShowcaseImage[]>([]);
    const [isLoadingShowcase, setIsLoadingShowcase] = useState(false);
    const [author, setAuthor] = useState<UserProfile | null>(null);

    const fetchComments = useCallback(async () => {
        setIsLoadingComments(true);
        try {
            const commentsData = await getCommentsForPrompt(promptId);
            setComments(commentsData);
        } catch (error) {
            console.error("Failed to fetch comments:", error);
        } finally {
            setIsLoadingComments(false);
        }
    }, [promptId]);

    const fetchShowcase = useCallback(async () => {
        setIsLoadingShowcase(true);
        try {
            const showcaseData = await getShowcaseImagesForPrompt(promptId);
            setShowcaseImages(showcaseData);
        } catch (error) {
            console.error("Failed to fetch showcase images:", error);
        } finally {
            setIsLoadingShowcase(false);
        }
    }, [promptId]);
    
    const fetchAuthor = useCallback(async (authorId: string) => {
        try {
            const profile = await getUserProfile(authorId);
            setAuthor(profile);
        } catch (error) {
            console.error("Failed to fetch author profile:", error);
            setAuthor(null);
        }
    }, []);

    useEffect(() => {
        fetchComments();
        fetchShowcase();
    }, [fetchComments, fetchShowcase]);
    
    const handlePostComment = async (text: string, parentId: string | null = null) => {
        if (!currentUser || !userProfile) throw new Error("Authentication required");
        await addComment({
            promptId: promptId,
            parentId,
            text,
            userId: currentUser.uid,
            username: userProfile.username,
            userPhotoURL: userProfile.photoURL,
        });
        await fetchComments();
        onCommentUpdate(promptId, 1);
    };

    const handleDeleteComment = async (comment: Comment) => {
        if (!currentUser) throw new Error("Authentication required");
        const result = await deleteComment(comment.id, currentUser.uid);
        if (result) {
            onCommentUpdate(promptId, -result.deletedCount);
            await fetchComments();
        }
    };
    
    const handleShowcaseSubmit = async (imageUrl: string) => {
        if (!currentUser || !userProfile) throw new Error("Authentication required");
        await addShowcaseImage({
            promptId: promptId,
            userId: currentUser.uid,
            username: userProfile.username,
            userPhotoURL: userProfile.photoURL,
            imageUrl,
        });
        await fetchShowcase();
        if (onShowcaseUpdate) {
            onShowcaseUpdate(promptId, 1);
        }
    };
    
    const handleDeleteShowcaseImage = async (imageId: string) => {
        if (!currentUser) throw new Error("Authentication required");
        await apiDeleteShowcaseImage(imageId, currentUser.uid);
        await fetchShowcase();
        if (onShowcaseUpdate) {
            onShowcaseUpdate(promptId, -1);
        }
    };

    return {
        comments,
        isLoadingComments,
        showcaseImages,
        isLoadingShowcase,
        author,
        fetchAuthor,
        handlePostComment,
        handleDeleteComment,
        fetchComments,
        handleShowcaseSubmit,
        handleDeleteShowcaseImage
    };
};
