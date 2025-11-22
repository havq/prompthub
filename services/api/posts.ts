import { Post, PostComment, PostCategory, PostCategoryWithCount } from '../../types';
import { fetchApi, mapItem, mapItems } from './core';
import { GetPromptsParams } from './prompts';

const mapPosts = (posts: any[]): Post[] => {
    if (!Array.isArray(posts)) return [];
    return posts.map(p => {
        const isPrivate = p.isPrivate === true || p.isPrivate === 1 || String(p.isPrivate) === '1';
        const rotation = Number(p.rotation || 0);

        let categoryIds: string[] = [];
        if (Array.isArray(p.categoryIds)) {
            categoryIds = p.categoryIds.map(String);
        } else if (p.categoryIds) {
            categoryIds = [String(p.categoryIds)];
        }
        
        let tags: string[] = [];
        if (Array.isArray(p.tags)) {
            tags = p.tags;
        } else if (p.tags && typeof p.tags === 'string') {
            try {
                const parsedTags = JSON.parse(p.tags);
                if (Array.isArray(parsedTags)) {
                    tags = parsedTags;
                }
            } catch (e) { /* ignore parse error */ }
        }
        
        let post_meta: Record<string, any> = {};
        if (p.post_meta && typeof p.post_meta === 'object' && !Array.isArray(p.post_meta)) {
            post_meta = p.post_meta;
        } else if (p.post_meta && typeof p.post_meta === 'string') {
             try {
                const parsedMeta = JSON.parse(p.post_meta);
                if (typeof parsedMeta === 'object' && !Array.isArray(parsedMeta)) {
                    post_meta = parsedMeta;
                }
            } catch (e) { /* ignore parse error */ }
        }

        return { 
            ...mapItem(p),
            title: String(p.title || ''),
            content: String(p.content || ''),
            categoryIds, 
            tags,
            videoUrl: p.videoUrl || undefined,
            commentsEnabled: (p.commentsEnabled ?? true),
            isPrivate,
            status: p.status || 'approved',
            viewCount: Number(p.viewCount || 0),
            rotation,
            post_meta,
            authorPhotoURL: p.authorPhotoURL || null,
        };
    });
};

export const getPost = (postId: string): Promise<Post> => {
    return fetchApi<any>('posts', `&id=${postId}`).then(response => {
        const postData = Array.isArray(response) ? response[0] : response;
        if (!postData) throw new Error('Post not found');
        return mapPosts([postData])[0];
    });
};

export const getPosts = (params: GetPromptsParams): Promise<{ posts: Post[], total: number }> => {
    const query = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
        sortBy: params.sortBy,
    });
    if (params.searchTerm) query.set('searchTerm', params.searchTerm);
    if (params.category && params.category !== 'All') query.set('category', params.category);
    if (params.author) query.set('author', params.author);
    if (params.isAdmin) query.set('isAdmin', 'true');

    return fetchApi<{ posts: any[], total: number }>('posts', `&${query.toString()}`).then(response => ({
        ...response,
        posts: mapPosts(response.posts),
    }));
};

export const getPostSidebarData = (): Promise<{ mostViewed: Post[], mostCommented: Post[], tags: string[] }> => {
    return fetchApi<any>('posts', '&action=sidebar_data').then(data => ({
        mostViewed: mapPosts(data.mostViewed),
        mostCommented: mapPosts(data.mostCommented),
        tags: data.tags || []
    }));
};

export const addPost = (postData: Omit<Post, 'id' | 'createdAt'>): Promise<Post> => {
    return fetchApi<Post>('posts', '', { method: 'POST', body: JSON.stringify(postData) }).then(mapItem);
};
export const updatePost = (updatedPost: Post): Promise<Post> => {
    return fetchApi<Post>('posts', `&id=${updatedPost.id}`, { method: 'PUT', body: JSON.stringify(updatedPost) }).then(() => updatedPost);
};
export const deletePost = (postId: string): Promise<{ id: string }> => {
    return fetchApi<{ id: string }>('posts', `&id=${postId}`, { method: 'DELETE' });
};
export const getPostTags = (): Promise<string[]> => fetchApi<string[]>('posts', '&action=get_tags');
export const incrementPostViewCount = (postId: string): Promise<void> => fetchApi<void>('posts', `&id=${postId}&action=increment_view`, { method: 'POST' });


// --- Post Comment Functions ---
const mapPostCommentsTree = (comments: any[]): PostComment[] => {
    if (!Array.isArray(comments)) return [];
    return comments.map(c => ({
        ...mapItem(c),
        parentId: c.parentId ? String(c.parentId) : null,
        replies: c.replies ? mapPostCommentsTree(c.replies) : [],
    }));
};
export const getPostComments = (postId: string): Promise<PostComment[]> => {
    return fetchApi<any[] | null>('post_comments', `&postId=${postId}`).then(data => {
        if (!Array.isArray(data)) return [];
        return mapPostCommentsTree(data);
    });
};
export const addPostComment = (data: Omit<PostComment, 'id' | 'createdAt'>): Promise<PostComment> => {
    return fetchApi<PostComment>('post_comments', '', { method: 'POST', body: JSON.stringify(data) }).then(mapItem);
};
export const updatePostComment = (commentId: string, userId: string, text: string): Promise<PostComment> => {
    return fetchApi<PostComment>('post_comments', `&id=${commentId}`, { method: 'PUT', body: JSON.stringify({ text, userId }) });
};
export const deletePostComment = (commentId: string, userId: string): Promise<{ id: string, deletedCount: number }> => {
    return fetchApi<{ id: string, deletedCount: number }>('post_comments', `&id=${commentId}`, { method: 'DELETE' });
};

// --- Post Category Functions ---
export const getPostCategories = (): Promise<PostCategoryWithCount[]> => fetchApi<PostCategoryWithCount[]>('post_categories', '&counts=true').then(mapItems);
export const addPostCategory = (data: Omit<PostCategory, 'id'>): Promise<PostCategory> => fetchApi<PostCategory>('post_categories', '', { method: 'POST', body: JSON.stringify(data) }).then(mapItem);
export const updatePostCategory = (data: PostCategory): Promise<PostCategory> => fetchApi<PostCategory>('post_categories', `&id=${data.id}`, { method: 'PUT', body: JSON.stringify(data) }).then(() => data);
export const deletePostCategory = (id: string): Promise<{ id: string }> => fetchApi<{ id: string }>('post_categories', `&id=${id}`, { method: 'DELETE' });