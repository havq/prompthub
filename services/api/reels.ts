
import { Reel, ReelComment, PostCategory, PostCategoryWithCount, ReelCategory, ReelCategoryWithCount } from '../../utils/types';
import { fetchApi, mapItem, mapItems } from './core';

export interface GetReelsParams {
    page: number;
    limit: number;
    searchTerm?: string;
    category?: string;
}
export interface GetReelsResponse {
    reels: Reel[];
    total: number;
    likedIds?: Record<string, boolean>;
}

const mapReels = (reels: any[]): Reel[] => {
    if (!Array.isArray(reels)) return [];
    return reels.map(r => {
        let categoryIds: string[] = [];
        if (Array.isArray(r.categoryIds)) {
            categoryIds = r.categoryIds.map(String);
        } else if (typeof r.categoryIds === 'string' && r.categoryIds.startsWith('[')) {
            try {
                const parsed = JSON.parse(r.categoryIds);
                if (Array.isArray(parsed)) {
                    categoryIds = parsed.map(String);
                }
            } catch (e) {
                console.error("Failed to parse reel categoryIds:", r.categoryIds, e);
            }
        }

        let tags: string[] = [];
        if (Array.isArray(r.tags)) {
            tags = r.tags;
        } else if (typeof r.tags === 'string' && r.tags.startsWith('[')) {
            try {
                const parsed = JSON.parse(r.tags);
                if (Array.isArray(parsed)) {
                    tags = parsed;
                }
            } catch (e) {
                console.error("Failed to parse reel tags:", r.tags, e);
            }
        }

        const isNSFW = r.isNSFW === true || r.isNSFW === 1 || String(r.isNSFW) === '1';
        
        return {
            ...mapItem(r),
            tags,
            categoryIds,
            isNSFW,
            videoThumbnail: r.videoThumbnail || undefined,
        };
    });
};

export const getReel = (reelId: string): Promise<Reel> => fetchApi<any>('reels', `&id=${reelId}`).then(response => {
    if (!response || Array.isArray(response)) throw new Error('Reel not found');
    return mapReels([response])[0];
});
export const getReels = (params: GetReelsParams): Promise<GetReelsResponse> => {
    const query = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
    });
    if (params.searchTerm) {
        query.set('searchTerm', params.searchTerm);
    }
    if (params.category && params.category !== 'All') {
        query.set('category', params.category);
    }
    return fetchApi<GetReelsResponse>('reels', `&${query.toString()}`).then(response => ({
        ...response,
        reels: mapReels(response.reels),
    }));
};
export const addReel = (data: Omit<Reel, 'id' | 'createdAt' | 'likeCount' | 'viewCount'>): Promise<Reel> => {
    return fetchApi<Reel>('reels', '', { method: 'POST', body: JSON.stringify(data) }).then(mapItem);
};
export const updateReel = (data: Reel): Promise<Reel> => fetchApi<Reel>('reels', `&id=${data.id}`, { method: 'PUT', body: JSON.stringify(data) }).then(() => data);
export const deleteReel = (id: string): Promise<{ id: string }> => fetchApi<{ id: string }>('reels', `&id=${id}`, { method: 'DELETE' });
export const toggleReelLike = (id: string): Promise<{ liked: boolean }> => fetchApi<{ liked: boolean }>('reels', `&id=${id}&action=like`, { method: 'POST' });
export const incrementReelViewCount = (id: string): Promise<void> => fetchApi<void>('reels', `&id=${id}&action=view`, { method: 'POST' });
export const getReelComments = (reelId: string): Promise<{comments: ReelComment[], likedIds: Record<string, boolean>}> => fetchApi<{comments: ReelComment[], likedIds: Record<string, boolean>}>('reel_comments', `&reelId=${reelId}`);
export const addReelComment = (data: Omit<ReelComment, 'id' | 'createdAt'>): Promise<ReelComment> => fetchApi<ReelComment>('reel_comments', '', { method: 'POST', body: JSON.stringify(data) }).then(mapItem);
export const deleteReelComment = (commentId: string, userId: string): Promise<{ id: string, deletedCount: number }> => fetchApi<{ id: string, deletedCount: number }>('reel_comments', `&id=${commentId}`, { method: 'DELETE' });
export const updateReelComment = (commentId: string, userId: string, text: string): Promise<ReelComment> => fetchApi<ReelComment>('reel_comments', `&id=${commentId}`, { method: 'PUT', body: JSON.stringify({ text, userId }) });

// --- Reel Category Functions ---
export const getReelCategories = (): Promise<ReelCategoryWithCount[]> => fetchApi<ReelCategoryWithCount[]>('reel_categories', '&counts=true').then(mapItems);
export const addReelCategory = (data: Omit<ReelCategory, 'id'>): Promise<ReelCategory> => fetchApi<ReelCategory>('reel_categories', '', { method: 'POST', body: JSON.stringify(data) }).then(mapItem);
export const updateReelCategory = (data: ReelCategory): Promise<ReelCategory> => fetchApi<ReelCategory>('reel_categories', `&id=${data.id}`, { method: 'PUT', body: JSON.stringify(data) }).then(() => data);
export const deleteReelCategory = (id: string): Promise<{ id: string }> => fetchApi<{ id: string }>('reel_categories', `&id=${id}`, { method: 'DELETE' });
