
import { Prompt, Category, CategoryWithCount } from '../../types';
import { fetchApi, mapItem, mapItems } from './core';

export interface GetPromptsParams {
    page: number;
    limit: number;
    sortBy?: 'newest' | 'oldest' | 'rating' | 'votes' | 'views' | 'remixes' | 'comments';
    searchTerm?: string;
    category?: string;
    tag?: string;
    date?: string;
    author?: string;
    commentFilter?: 'any' | 'yes' | 'no';
    remixFilter?: 'any' | 'yes' | 'no';
    referenceImageFilter?: 'any' | 'yes' | 'no';
    nsfwFilter?: 'any' | 'yes' | 'no';
    isAdmin?: boolean;
}

export interface GetPromptsResponse {
    prompts: Prompt[];
    total: number;
    allTags?: string[];
    categoryCounts?: Record<string, number>;
}

const mapPrompts = (prompts: any[]): Prompt[] => {
    if (!Array.isArray(prompts)) return [];
    return prompts
        .filter(p => p && typeof p === 'object' && (p.id || p._id))
        // Filter out items that lack minimal content (id exists but everything else is empty)
        .filter(p => (p.text && String(p.text).trim()) || (p.title && String(p.title).trim()) || p.imageUrl || p.videoUrl)
        .map(p => {
            const { _id, ...rest } = p;
            const isPrivate = p.isPrivate === true || p.isPrivate === 1 || String(p.isPrivate) === '1';
            const isNSFW = p.isNSFW === true || p.isNSFW === 1 || String(p.isNSFW) === '1';
            const rotation = Number(p.rotation || 0);
            
            let categoryIds: string[] = [];
            if (Array.isArray(p.categoryIds)) {
                categoryIds = p.categoryIds.map(String);
            } else if (p.categoryIds) {
                categoryIds = [String(p.categoryIds)];
            }
            // Fallback for legacy folderId
            if (categoryIds.length === 0 && (p.folderId || p.folderIds)) {
                const fIds = p.folderIds || (p.folderId ? [p.folderId] : []);
                categoryIds = Array.isArray(fIds) ? fIds.map(String) : [String(fIds)];
            }

            const referenceImageUrl = p.referenceImageUrl || undefined;
            const requiresUserImage = !!p.requiresUserImage;
            const safeText = String(p.text || '');
            const title = String(p.title || (safeText ? safeText.substring(0, 50) + (safeText.length > 50 ? '...' : '') : 'Untitled'));
            const promptNote = p.promptNote ? String(p.promptNote) : undefined;
            const promptSource = p.promptSource ? String(p.promptSource) : undefined;

            return { 
                ...mapItem(rest),
                title,
                text: safeText,
                promptNote,
                promptSource,
                videoUrl: rest.videoUrl || undefined,
                categoryIds, 
                referenceImageUrl, 
                requiresUserImage,
                isPrivate,
                isNSFW,
                rotation,
                status: p.status || 'approved',
                viewCount: Number(p.viewCount || 0),
                commentCount: Number(p.commentCount || 0),
                favoriteCount: Number(p.favoriteCount || 0),
                remixCount: Number(p.remixCount || 0),
                commentsEnabled: p.commentsEnabled ?? true,
            };
        });
}

export const getPrompts = (params: GetPromptsParams): Promise<GetPromptsResponse> => {
    const query = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
        sortBy: params.sortBy || 'newest',
    });
    if (params.searchTerm) query.set('searchTerm', params.searchTerm);
    if (params.category && params.category !== 'All') query.set('category', params.category);
    if (params.tag) query.set('tag', params.tag);
    if (params.date && params.date !== 'all') query.set('date', params.date);
    if (params.author) query.set('author', params.author);
    if (params.isAdmin) query.set('isAdmin', 'true');
    
    if (params.commentFilter && params.commentFilter !== 'any') query.set('commentFilter', params.commentFilter);
    if (params.remixFilter && params.remixFilter !== 'any') query.set('remixFilter', params.remixFilter);
    if (params.referenceImageFilter && params.referenceImageFilter !== 'any') query.set('referenceImageFilter', params.referenceImageFilter);
    if (params.nsfwFilter && params.nsfwFilter !== 'any') query.set('nsfwFilter', params.nsfwFilter);

    return fetchApi<GetPromptsResponse>('prompts', `&${query.toString()}`).then(response => ({
        ...response,
        prompts: mapPrompts(response.prompts),
    }));
};

export const getPrompt = (id: string): Promise<Prompt> => {
    return fetchApi<any>('prompts', `&id=${id}`).then(response => {
        const promptData = Array.isArray(response) ? response[0] : response;
        if (!promptData) throw new Error('Prompt not found');
        return mapPrompts([promptData])[0];
    });
};

export const addPrompt = (data: Omit<Prompt, 'id' | 'createdAt'>): Promise<Prompt> => {
    return fetchApi<Prompt>('prompts', '', { method: 'POST', body: JSON.stringify(data) }).then(mapItem);
};

export const updatePrompt = (data: Prompt): Promise<Prompt> => {
    return fetchApi<Prompt>('prompts', `&id=${data.id}`, { method: 'PUT', body: JSON.stringify(data) }).then(() => data);
};

export const deletePrompt = (id: string): Promise<{ id: string }> => {
    return fetchApi<{ id: string }>('prompts', `&id=${id}`, { method: 'DELETE' });
};

export const remixPrompt = (newPromptData: Omit<Prompt, 'id' | 'createdAt'>, originalPromptId: string): Promise<Prompt> => {
    return fetchApi<Prompt>('prompts', `&action=remix&originalPromptId=${originalPromptId}`, { 
        method: 'POST', 
        body: JSON.stringify(newPromptData) 
    }).then(mapItem);
};

export const incrementViewCount = (promptId: string): Promise<void> => {
    return fetchApi<void>('prompts', `&id=${promptId}&action=increment_view`, { method: 'POST' });
};

// --- Category (Admin Categories) Functions ---
export const getCategories = (): Promise<CategoryWithCount[]> => fetchApi<CategoryWithCount[]>('categories', '&counts=true').then(mapItems);
export const addCategory = (data: Omit<Category, 'id'>): Promise<Category> => fetchApi<Category>('categories', '', { method: 'POST', body: JSON.stringify(data) }).then(mapItem);
export const updateCategory = (data: Category): Promise<Category> => fetchApi<Category>('categories', `&id=${data.id}`, { method: 'PUT', body: JSON.stringify(data) }).then(() => data);
export const deleteCategory = (id: string): Promise<{ id: string }> => fetchApi<{ id: string }>('categories', `&id=${id}`, { method: 'DELETE' });
