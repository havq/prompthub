import { UserProfile, TopContributor, AnalyticsData, Notification } from '../../utils/types';
import { fetchApi, mapItems } from './core';
import { createNotification } from './social';

// --- User Profile Functions ---
export const createUserProfile = (uid: string, username: string, email: string, role: UserProfile['role'], token?: string): Promise<void> => fetchApi<void>('users', '', {
    method: 'POST',
    body: JSON.stringify({
        uid,
        username,
        email,
        role,
        photoURL: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(username)}&size=120`
    })
}, token);

export const getUserProfile = (uid: string, token?: string): Promise<UserProfile | null> => fetchApi<UserProfile | null>('users', `&uid=${uid}`, {}, token);

export const getAllUsers = (): Promise<UserProfile[]> => fetchApi<UserProfile[]>('users');
export const updateUserProfile = (uid: string, data: Partial<Omit<UserProfile, 'uid'>>): Promise<void> => fetchApi<void>('users', `&uid=${uid}`, { method: 'PUT', body: JSON.stringify(data) });
export const findUserByUsername = (username: string): Promise<Partial<UserProfile> | null> => {
    return fetchApi<Partial<UserProfile> | null>('users', `&action=lookup_username`, { 
        method: 'POST', 
        body: JSON.stringify({ username }) 
    });
};
export const addUser = (userData: Omit<UserProfile, 'uid'>): Promise<UserProfile> => fetchApi<UserProfile>('users', '', { method: 'POST', body: JSON.stringify(userData) });
export const deleteUser = (uid: string): Promise<{ id: string }> => fetchApi<{ id: string }>('users', `&uid=${uid}`, { method: 'DELETE' });
export const getTopContributors = (): Promise<TopContributor[]> => fetchApi<TopContributor[]>('users', '&action=top_contributors');

// --- Social Functions ---
export const followUser = async (currentUserId: string, targetUserId: string): Promise<void> => {
    await fetchApi<void>('users', '&action=follow', { 
        method: 'POST', 
        body: JSON.stringify({ currentUserId, targetUserId }) 
    });
    
    const actor = await getUserProfile(currentUserId);
    if (actor) {
        await createNotification({
            recipientId: targetUserId,
            actorId: currentUserId,
            actorName: actor.username,
            actorPhotoURL: actor.photoURL,
            type: 'follow',
            read: false,
            createdAt: new Date().toISOString()
        });
    }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string): Promise<void> => {
    await fetchApi<void>('users', '&action=unfollow', { 
        method: 'POST', 
        body: JSON.stringify({ currentUserId, targetUserId }) 
    });
};

// --- Analytics ---
export const getAnalyticsData = (userId: string, page: number = 1, limit: number = 10): Promise<AnalyticsData> => fetchApi<AnalyticsData>('analytics', `&userId=${userId}&page=${page}&limit=${limit}`);

// --- Password Reset ---
export const sendPasswordResetEmail = (email: string): Promise<void> => {
    return fetchApi<void>('auth', '&action=forgot_password', { 
        method: 'POST', 
        body: JSON.stringify({ email }) 
    });
};

export const resetPassword = (uid: string, token: string, newPassword: string): Promise<void> => {
    return fetchApi<void>('auth', '&action=reset_password', { 
        method: 'POST', 
        body: JSON.stringify({ uid, token, newPassword }) 
    });
};