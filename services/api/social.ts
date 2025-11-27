

import { Comment, Report, ShowcaseImage, Notification, Suggestion, Prompt, UserProfile } from '../../utils/types';
import { fetchApi, mapItem, mapItems } from './core';
import { getPrompts } from './prompts';
import { getUserProfile } from './users';

// --- Comment Functions (Prompt Comments) ---
export const getAllComments = (): Promise<Comment[]> => fetchApi<Comment[]>('comments').then(mapItems);
export const getCommentCounts = (): Promise<Record<string, number>> => fetchApi<Record<string, number>>('comments', '&action=counts');

export const getCommentsForPrompt = (promptId: string): Promise<Comment[]> => 
    fetchApi<Comment[] | null>('comments', `&promptId=${promptId}`).then(data => Array.isArray(data) ? data : []);

export const addComment = (data: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> => fetchApi<Comment>('comments', '', { method: 'POST', body: JSON.stringify(data) }).then(mapItem);
export const deleteComment = (commentId: string, userId: string): Promise<{ id: string, deletedCount: number } | null> => fetchApi<{ id: string, deletedCount: number }>('comments', `&id=${commentId}`, { method: 'DELETE' });
export const updateComment = (commentId: string, userId: string, text: string): Promise<Comment | null> => fetchApi<Comment>('comments', `&id=${commentId}`, { method: 'PUT', body: JSON.stringify({ text, userId }) });


// --- Report Functions ---
export const addReport = (data: Omit<Report, 'id'|'createdAt'|'status'>): Promise<Report> => fetchApi<Report>('reports', '', { method: 'POST', body: JSON.stringify(data) }).then(mapItem);
export const getReports = (): Promise<Report[]> => fetchApi<Report[]>('reports').then(mapItems);
export const updateReport = (data: Report): Promise<Report> => fetchApi<Report>('reports', `&id=${data.id}`, { method: 'PUT', body: JSON.stringify(data) }).then(() => data);
export const deleteReport = (id: string): Promise<{ id: string }> => fetchApi<{ id: string }>('reports', `&id=${id}`, { method: 'DELETE' });

// --- Suggestion Functions ---
export const getSuggestions = (): Promise<Suggestion[]> => fetchApi<Suggestion[]>('suggestions').then(mapItems);
export const addSuggestion = (data: Omit<Suggestion, 'id'|'createdAt'|'status'>): Promise<Suggestion> => fetchApi<Suggestion>('suggestions', '', { method: 'POST', body: JSON.stringify(data) }).then(mapItem);
export const updateSuggestion = (data: Suggestion): Promise<Suggestion> => fetchApi<Suggestion>('suggestions', `&id=${data.id}`, { method: 'PUT', body: JSON.stringify(data) }).then(() => data);
export const deleteSuggestion = (id: string): Promise<{ id: string }> => fetchApi<{ id: string }>('suggestions', `&id=${id}`, { method: 'DELETE' });

// --- Showcase Functions ---
export const getShowcaseImagesForPrompt = (promptId: string): Promise<ShowcaseImage[]> => fetchApi<ShowcaseImage[]>('showcase_images', `&promptId=${promptId}`).then(mapItems);
export const addShowcaseImage = (data: Omit<ShowcaseImage, 'id' | 'createdAt'>): Promise<ShowcaseImage> => fetchApi<ShowcaseImage>('showcase_images', '', { method: 'POST', body: JSON.stringify(data) }).then(mapItem);
export const deleteShowcaseImage = (imageId: string, userId: string): Promise<{ id: string }> => fetchApi<{ id: string }>('showcase_images', `&id=${imageId}&userId=${userId}`, { method: 'DELETE' });
export const getAllShowcaseImageCounts = (): Promise<Record<string, number>> => fetchApi<Record<string, number>>('showcase_images', '&action=counts');
export const getAllShowcaseImages = (): Promise<ShowcaseImage[]> => fetchApi<ShowcaseImage[]>('showcase_images').then(mapItems);
export const getAdminShowcaseImages = (page: number, limit: number, searchTerm?: string): Promise<{ images: ShowcaseImage[], total: number }> => {
    const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        searchTerm: searchTerm || ''
    });
    return fetchApi<{ images: ShowcaseImage[], total: number }>('showcase_images', `&${query.toString()}`).then(response => ({
        images: mapItems(response.images),
        total: response.total
    }));
};

// --- Notification Functions ---
const mapNotifications = (items: any[]): Notification[] => {
    if (!Array.isArray(items)) return [];
    return items.map(item => ({
        ...item,
        id: String(item.id),
        read: !!item.is_read,
        ratingValue: item.rating_value !== undefined && item.rating_value !== null ? Number(item.rating_value) : undefined,
    }));
};

export const createNotification = (notification: Omit<Notification, 'id'>): Promise<void> => fetchApi<void>('notifications', '', { method: 'POST', body: JSON.stringify(notification) });

export const listenForNotifications = (userId: string, callback: (notifications: Notification[]) => void): (() => void) => {
    let active = true;
    const poll = async () => {
        if (!active) return;
        try {
            const data = await fetchApi<any[]>('notifications', `&recipientId=${userId}`);
            if (active) callback(mapNotifications(data));
        } catch (e) {
            console.error("Polling notifications failed", e);
        }
    };
    poll(); // Initial poll
    const interval = setInterval(poll, 60000); // Poll every minute
    return () => {
        active = false;
        clearInterval(interval);
    };
};
export const markNotificationAsRead = (userId: string, notificationId: string, type: Notification['type']): Promise<void> => fetchApi<void>('notifications', `&id=${notificationId}`, { method: 'POST', body: JSON.stringify({ is_read: true, recipientId: userId }) });
export const markAllNotificationsAsRead = (userId: string, type?: Notification['type']): Promise<void> => fetchApi<void>('notifications', `&recipientId=${userId}`, { method: 'POST', body: JSON.stringify({ readAll: true, type: type || 'all' }) });
export const deleteNotification = (userId: string, notificationId: string): Promise<void> => 
    fetchApi<void>('notifications', `&recipientId=${userId}&id=${notificationId}`, { method: 'DELETE' });

export const deleteAllNotifications = (userId: string): Promise<void> => 
    fetchApi<void>('notifications', `&recipientId=${userId}&action=deleteAll`, { method: 'DELETE' });

// --- Favorites ---
export const getUserFavorites = (uid: string): Promise<Set<string>> =>
  fetchApi<any>('favorites', `&userId=${uid}`).then(data => {
    if (Array.isArray(data)) {
      const ids = data.map(item => {
          if (typeof item === 'object' && item !== null && 'prompt_id' in item) {
            return String(item.prompt_id);
          }
          return String(item);
        }).filter(id => id);
      return new Set(ids);
    } else if (data && typeof data === 'object') {
      return new Set(Object.keys(data));
    }
    return new Set<string>();
  });

export const setUserFavorite = async (uid: string, promptId: string, isFavorite: boolean, authorId?: string): Promise<void> => {
    if (isFavorite) {
        await fetchApi<void>('favorites', '', { method: 'POST', body: JSON.stringify({ userId: uid, promptId }) });
        if (authorId && authorId !== uid) {
            const actor = await getUserProfile(uid);
            const allPrompts = await getPrompts({ page: 1, limit: 10000, sortBy: 'newest'});
            const prompt = allPrompts.prompts.find(p => p.id === promptId);
            if (prompt && actor) {
                await createNotification({
                    recipientId: authorId,
                    actorId: uid,
                    actorName: actor.username,
                    actorPhotoURL: actor.photoURL,
                    type: 'favorite',
                    promptId: promptId,
                    promptText: String(prompt.text || '').substring(0, 50),
                    read: false,
                    createdAt: new Date().toISOString()
                });
            }
        }
    } else {
        await fetchApi<void>('favorites', `&userId=${uid}&promptId=${promptId}`, { method: 'DELETE' });
    }
};

// --- Ratings ---
export const getRatings = (userId?: string): Promise<Record<string, number>> => {
    const endpoint = userId ? `&userId=${userId}` : '';
    return fetchApi<Record<string, number>>('ratings', endpoint);
};

export const saveRating = async (prompt: Prompt, rating: number, profile: UserProfile | null): Promise<void> => {
    const payload: any = {
        promptId: prompt.id,
        rating,
    };

    if (profile) {
        payload.userId = profile.uid;
    }

    await fetchApi<void>('ratings', '', { method: 'POST', body: JSON.stringify(payload) });

    const authorId = prompt.authorId;
    if (profile && authorId && authorId !== profile.uid && rating > 0) {
        await createNotification({
            recipientId: authorId,
            actorId: profile.uid,
            actorName: profile.username,
            actorPhotoURL: profile.photoURL,
            type: 'rating',
            promptId: prompt.id,
            promptText: String(prompt.text || '').substring(0, 50),
            ratingValue: rating,
            read: false,
            createdAt: new Date().toISOString()
        });
    }
};
export const getAverageRating = (promptId: string): Promise<{ average: number, count: number }> => fetchApi<{ average: number, count: number }>('ratings', `&promptId=${promptId}&action=average`);

const parseAverageRatings = (data: any): Record<string, { average: number; count: number }> => {
    if (!data) return {};
    const result: Record<string, { average: number; count: number }> = {};

    if (Array.isArray(data)) {
        for (const ratingData of data) {
            const promptId = ratingData.prompt_id || ratingData.id;
            if (promptId && ratingData.average !== undefined && ratingData.count !== undefined) {
                result[String(promptId)] = {
                    average: parseFloat(String(ratingData.average).replace(',', '.')) || 0,
                    count: parseInt(String(ratingData.count), 10) || 0
                };
            }
        }
    } else if (typeof data === 'object') {
        for (const promptId in data) {
            const ratingData = data[promptId];
            if (ratingData && ratingData.average !== undefined && ratingData.count !== undefined) {
                result[promptId] = {
                    average: parseFloat(String(ratingData.average).replace(',', '.')) || 0,
                    count: parseInt(String(ratingData.count), 10) || 0
                };
            }
        }
    }
    return result;
};

export const getAllAverageRatings = (): Promise<Record<string, { average: number; count: number }>> => 
    fetchApi<any>('ratings', `&action=all_averages`).then(parseAverageRatings);

// Optimized fetcher to get both at once
export const getCombinedRatings = (userId?: string): Promise<{ 
    averageRatings: Record<string, { average: number; count: number }>, 
    userRatings: Record<string, number> 
}> => {
    const endpoint = `&action=combined${userId ? `&userId=${userId}` : ''}`;
    return fetchApi<any>('ratings', endpoint).then(data => ({
        averageRatings: parseAverageRatings(data.averageRatings),
        userRatings: data.userRatings || {}
    }));
};