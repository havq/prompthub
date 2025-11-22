

import * as externalApi from './externalApi';
// All functions now point to the live API for posts and categories.
import * as mockApi from './mockFirebase';
// FIX: Add Suggestion to import
import { Prompt, Category, UserProfile, Comment, Report, ShowcaseImage, Notification, StaticPage, Collection, CategoryWithCount, TopContributor, AnalyticsData, Suggestion, Reel, ReelComment, Post, PostComment, PostCategory, PostCategoryWithCount, ReelCategory, ReelCategoryWithCount, SupportTicket, TicketMessage, AuthUser } from '../types';
import { getAuth } from './firebaseConfig';
import { getSettings } from './settingsService';

// --- HELPERS FOR API COMMUNICATION ---
async function fetchApi<T>(resource: string, endpoint: string = '', options: RequestInit = {}): Promise<T> {
  const apiUrl = getSettings().externalApiUrl;
  if (!apiUrl) throw new Error("External API URL is not configured.");
  
  const isGet = options.method === 'GET' || !options.method;
  const cacheBuster = isGet ? `&_=${new Date().getTime()}` : '';

  const url = `${apiUrl}?resource=${resource}${endpoint}${cacheBuster}`;
  
  const auth = getAuth();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (auth && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.error("Error getting Firebase ID token:", error);
    }
  }
  
  // Add timeout using AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  const config: RequestInit = {
    ...options,
    headers: headers,
    signal: controller.signal,
  };

  try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `API Error: ${response.statusText}` }));
        const errorMessage = errorData.error || errorData.message || `API Error: ${response.status}`;
        throw new Error(errorMessage);
      }
      const text = await response.text();
      return text ? JSON.parse(text) : ({} as T);
  } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
          throw new Error('Request timed out. The server is taking too long to respond.');
      }
      throw error;
  }
}

export const mapItem = <T extends {id: any}>(item: T): T => {
    return { ...item, id: String(item.id) };
}

export const mapItems = <T extends {id: any}>(items: T[]): T[] => {
    if (!Array.isArray(items)) return [];
    return items.map(mapItem);
}
// --- END HELPERS ---


// --- HELPERS FOR LOCAL GUEST COLLECTIONS ---
const GUEST_STORAGE_KEY = 'promptGuestCollections';

const getLocalCollections = (): Collection[] => {
  try {
    const data = localStorage.getItem(GUEST_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
};

const saveLocalCollections = (collections: Collection[]) => {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(collections));
  } catch (e) { console.error("Failed to save guest collections", e); }
};
// --- END HELPERS ---

// --- Prompt Functions ---
export const getPrompts = (params: externalApi.GetPromptsParams): Promise<externalApi.GetPromptsResponse> => externalApi.getPrompts(params);
export const getPrompt = (id: string): Promise<Prompt> => externalApi.getPrompt(id);
export const addPrompt = (data: Omit<Prompt, 'id' | 'createdAt'>): Promise<Prompt> => externalApi.addPrompt(data);
export const updatePrompt = (data: Prompt): Promise<Prompt> => externalApi.updatePrompt(data);
export const deletePrompt = (id: string): Promise<{ id: string }> => externalApi.deletePrompt(id);
export const remixPrompt = (newPromptData: Omit<Prompt, 'id' | 'createdAt'>, originalPromptId: string): Promise<Prompt> => externalApi.remixPrompt(newPromptData, originalPromptId);
export const incrementViewCount = (promptId: string): Promise<void> => externalApi.incrementViewCount(promptId);

// --- Post Functions ---
export const getPost = (postId: string): Promise<Post> => externalApi.getPost(postId);
export const getPosts = (params: externalApi.GetPromptsParams): Promise<{ posts: Post[], total: number }> => externalApi.getPosts(params);
export const getPostSidebarData = (): Promise<{ mostViewed: Post[], mostCommented: Post[], tags: string[] }> => externalApi.getPostSidebarData();
export const addPost = (data: Omit<Post, 'id' | 'createdAt'>): Promise<Post> => externalApi.addPost(data);
export const updatePost = (data: Post): Promise<Post> => externalApi.updatePost(data);
export const deletePost = (id: string): Promise<{ id: string }> => externalApi.deletePost(id);
export const getPostComments = (postId: string): Promise<PostComment[]> => externalApi.getPostComments(postId);
export const addPostComment = (data: Omit<PostComment, 'id' | 'createdAt'>): Promise<PostComment> => externalApi.addPostComment(data);
export const deletePostComment = (commentId: string, userId: string): Promise<{ id: string, deletedCount: number }> => externalApi.deletePostComment(commentId, userId);
export const updatePostComment = (commentId: string, userId: string, text: string): Promise<PostComment> => externalApi.updatePostComment(commentId, userId, text);
export const getPostTags = (): Promise<string[]> => externalApi.getPostTags();
export const incrementPostViewCount = (postId: string): Promise<void> => externalApi.incrementPostViewCount(postId);


// --- Post Category Functions ---
export const getPostCategories = (): Promise<PostCategoryWithCount[]> => externalApi.getPostCategories();
export const addPostCategory = (data: Omit<PostCategory, 'id'>): Promise<PostCategory> => externalApi.addPostCategory(data);
export const updatePostCategory = (data: PostCategory): Promise<PostCategory> => externalApi.updatePostCategory(data);
export const deletePostCategory = (id: string): Promise<{ id: string }> => externalApi.deletePostCategory(id);


// --- Reel Functions ---
export const getReel = (reelId: string): Promise<Reel> => externalApi.getReel(reelId);
export const getReels = (params: { page: number, limit: number, searchTerm?: string, category?: string }): Promise<externalApi.GetReelsResponse> => externalApi.getReels(params);
export const addReel = (data: Omit<Reel, 'id' | 'createdAt' | 'likeCount' | 'viewCount'>): Promise<Reel> => externalApi.addReel(data);
export const updateReel = (data: Reel): Promise<Reel> => externalApi.updateReel(data);
export const deleteReel = (id: string): Promise<{ id: string }> => externalApi.deleteReel(id);
export const toggleReelLike = (id: string): Promise<{ liked: boolean }> => externalApi.toggleReelLike(id);
export const incrementReelViewCount = (id: string): Promise<void> => externalApi.incrementReelViewCount(id);
export const getReelComments = (reelId: string): Promise<{comments: ReelComment[], likedIds: Record<string, boolean>}> => externalApi.getReelComments(reelId);
export const addReelComment = (data: Omit<ReelComment, 'id' | 'createdAt'>): Promise<ReelComment> => externalApi.addReelComment(data);
export const deleteReelComment = (commentId: string, userId: string): Promise<{ id: string, deletedCount: number }> => externalApi.deleteReelComment(commentId, userId);
export const updateReelComment = (commentId: string, userId: string, text: string): Promise<ReelComment> => externalApi.updateReelComment(commentId, userId, text);

// --- Reel Category Functions ---
export const getReelCategories = (): Promise<ReelCategoryWithCount[]> => fetchApi<ReelCategoryWithCount[]>('reel_categories', '&counts=true').then(mapItems);
export const addReelCategory = (data: Omit<ReelCategory, 'id'>): Promise<ReelCategory> => fetchApi<ReelCategory>('reel_categories', '', { method: 'POST', body: JSON.stringify(data) }).then(mapItem);
export const updateReelCategory = (data: ReelCategory): Promise<ReelCategory> => fetchApi<ReelCategory>('reel_categories', `&id=${data.id}`, { method: 'PUT', body: JSON.stringify(data) }).then(() => data);
export const deleteReelCategory = (id: string): Promise<{ id: string }> => fetchApi<{ id: string }>('reel_categories', `&id=${id}`, { method: 'DELETE' });


// --- Tags ---
export const getTags = (): Promise<string[]> => externalApi.getTags();

// --- Category (Admin Categories) Functions ---
export const getCategories = (): Promise<CategoryWithCount[]> => externalApi.getCategories();
export const addCategory = (data: Omit<Category, 'id'>): Promise<Category> => externalApi.addCategory(data);
export const updateCategory = (data: Category): Promise<Category> => externalApi.updateCategory(data);
export const deleteCategory = (id: string): Promise<{ id: string }> => externalApi.deleteCategory(id);

// --- Static Page Functions ---
export const getStaticPages = (): Promise<StaticPage[]> => externalApi.getStaticPages();
export const addStaticPage = (data: Omit<StaticPage, 'id' | 'createdAt'>): Promise<StaticPage> => externalApi.addStaticPage(data);
export const updateStaticPage = (data: StaticPage): Promise<StaticPage> => externalApi.updateStaticPage(data);
export const deleteStaticPage = (id: string): Promise<{ id: string }> => externalApi.deleteStaticPage(id);

// --- User Profile Functions ---
// FIX: Pass the 'role' argument to externalApi.createUserProfile to match expected signature.
// FIX: Accept and pass optional token to support authenticated profile creation/fetching during sign-in.
export const createUserProfile = (uid: string, username: string, email: string, role: UserProfile['role'], token?: string): Promise<void> => externalApi.createUserProfile(uid, username, email, role, token);
export const getUserProfile = (uid: string, token?: string): Promise<UserProfile | null> => externalApi.getUserProfile(uid, token);
export const getAllUsers = (): Promise<UserProfile[]> => externalApi.getAllUsers();
export const updateUserProfile = (uid: string, data: Partial<Omit<UserProfile, 'uid'>>): Promise<void> => externalApi.updateUserProfile(uid, data);
export const findUserByUsername = (username: string): Promise<Partial<UserProfile> | null> => externalApi.findUserByUsername(username);
export const addUser = (userData: Omit<UserProfile, 'uid'>): Promise<UserProfile> => externalApi.addUser(userData);
export const deleteUser = (uid: string): Promise<{ id: string }> => externalApi.deleteUser(uid);
export const getTopContributors = (): Promise<TopContributor[]> => externalApi.getTopContributors();

// --- Analytics ---
export const getAnalyticsData = (userId: string, page: number = 1, limit: number = 10): Promise<AnalyticsData> => externalApi.getAnalyticsData(userId, page, limit);

// --- Payment ---
export const createSepayPayment = (data: { amount: number, content: string }): Promise<{ paymentUrl: string }> => externalApi.createSepayPayment(data);
export const verifySepayPayment = (data: any): Promise<{ success: boolean }> => externalApi.verifySepayPayment(data);

export const createPaypalOrder = (data: { amount: number, currency: string }): Promise<{ orderID: string }> => externalApi.createPaypalOrder(data);
// FIX: The function call was passing an object `{ orderID }` to `externalApi.capturePaypalOrder`, which expects a string `orderID`. The call is now corrected to pass the string directly.
export const capturePaypalOrder = (orderID: string): Promise<{ success: boolean }> => externalApi.capturePaypalOrder(orderID);


// --- Password Reset ---
export const sendPasswordResetEmail = (email: string): Promise<void> => {
    const auth = getAuth();
    if (!auth) throw new Error("Firebase Auth not configured");
    return auth.sendPasswordResetEmail(email);
};

// --- Comment Functions ---
export const getAllComments = (): Promise<Comment[]> => externalApi.getAllComments();
export const getCommentCounts = (): Promise<Record<string, number>> => externalApi.getCommentCounts();
export const getCommentsForPrompt = (promptId: string): Promise<Comment[]> => externalApi.getCommentsForPrompt(promptId);
export const addComment = (data: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> => externalApi.addComment(data);
export const deleteComment = (commentId: string, userId: string): Promise<{ id: string, deletedCount: number } | null> => externalApi.deleteComment(commentId, userId);
export const updateComment = (commentId: string, userId: string, text: string): Promise<Comment | null> => externalApi.updateComment(commentId, userId, text);

// --- Report Functions ---
export const addReport = (data: Omit<Report, 'id'|'createdAt'|'status'>): Promise<Report> => externalApi.addReport(data);
export const getReports = (): Promise<Report[]> => externalApi.getReports();
export const updateReport = (data: Report): Promise<Report> => externalApi.updateReport(data);
export const deleteReport = (id: string): Promise<{ id: string }> => externalApi.deleteReport(id);

// --- Collection (User Folders) Functions ---
export const getCollections = (user: AuthUser | null): Promise<Collection[]> => {
    if (!user) {
        return Promise.resolve(getLocalCollections());
    }
    return externalApi.getCollectionsForUser(user.uid);
};

export const createCollection = async (user: AuthUser | null, name: string): Promise<Collection[]> => {
    if (!user) {
        const collections = getLocalCollections();
        const newCollection: Collection = { id: `guest-${Date.now()}`, name, userId: 'guest', promptIds: {} };
        const updatedCollections = [...collections, newCollection];
        saveLocalCollections(updatedCollections);
        return updatedCollections;
    }
    await externalApi.createCollectionForUser(user.uid, name);
    return externalApi.getCollectionsForUser(user.uid);
};

export const updateCollection = async (user: AuthUser | null, collectionId: string, name: string): Promise<Collection[]> => {
    if (!user) {
        const collections = getLocalCollections().map(c => c.id === collectionId ? { ...c, name } : c);
        saveLocalCollections(collections);
        return collections;
    }
    await externalApi.renameCollectionForUser(user.uid, collectionId, name);
    return externalApi.getCollectionsForUser(user.uid);
};

export const deleteCollection = async (user: AuthUser | null, collectionId: string): Promise<Collection[]> => {
    if (!user) {
        const collections = getLocalCollections().filter(c => c.id !== collectionId);
        saveLocalCollections(collections);
        return collections;
    }
    await externalApi.deleteCollectionForUser(user.uid, collectionId);
    return externalApi.getCollectionsForUser(user.uid);
};

export const togglePromptInCollection = async (user: AuthUser | null, promptId: string, collectionId: string): Promise<Collection[]> => {
    const updateLogic = (cols: Collection[]) => {
        const targetCollection = cols.find(c => c.id === collectionId);
        if(targetCollection) {
            if (!targetCollection.promptIds) {
                targetCollection.promptIds = {};
            }
            const isInCollection = !!targetCollection.promptIds[promptId];
            if (isInCollection) {
                delete targetCollection.promptIds[promptId];
            } else {
                targetCollection.promptIds[promptId] = true;
            }
        }
        return cols;
    }
    if (user) {
        // FIX: The 'collections' variable was used without being declared. Added 'const' to declare it.
        const collections = await externalApi.getCollectionsForUser(user.uid);
        const collection = collections.find(c => c.id === collectionId);
        const isInCollection = !!collection?.promptIds?.[promptId];
        await externalApi.togglePromptInCollectionForUser(user.uid, collectionId, promptId, isInCollection);
        return externalApi.getCollectionsForUser(user.uid);
    }
    const guestCollections = updateLogic(getLocalCollections());
    saveLocalCollections(guestCollections);
    return guestCollections;
};

export const mergeAndClearLocalCollections = async (uid: string): Promise<void> => {
    const localCollections = getLocalCollections();
    if (localCollections.length === 0) return;

    try {
        const remoteCollections = await externalApi.getCollectionsForUser(uid);
        const remoteCollectionMap = new Map(remoteCollections.map(c => [c.name, c]));

        const collectionsToCreate = localCollections.filter(lc => !remoteCollectionMap.has(lc.name));
        
        // Step 1: Create all missing collections in parallel
        if (collectionsToCreate.length > 0) {
            await Promise.all(
                collectionsToCreate.map(lc => externalApi.createCollectionForUser(uid, lc.name))
            );
            // After creation, re-fetch all collections to get their new IDs
            const updatedRemoteCollections = await externalApi.getCollectionsForUser(uid);
            updatedRemoteCollections.forEach(rc => {
                if (!remoteCollectionMap.has(rc.name)) {
                    remoteCollectionMap.set(rc.name, rc);
                }
            });
        }

        // Step 2: Prepare all prompt additions
        const promptAdditions: Promise<any>[] = [];
        localCollections.forEach(localColl => {
            const targetRemoteColl = remoteCollectionMap.get(localColl.name);
            if (targetRemoteColl) {
                const promptsToAdd = Object.keys(localColl.promptIds || {});
                promptsToAdd.forEach(promptId => {
                    // Only add if not already present
                    if (!targetRemoteColl.promptIds || !targetRemoteColl.promptIds[promptId]) {
                        // The 'isInCollection' parameter is false, so this will add it
                        promptAdditions.push(
                            externalApi.togglePromptInCollectionForUser(uid, targetRemoteColl.id, promptId, false)
                        );
                    }
                });
            }
        });

        // Step 3: Execute all prompt additions in parallel
        if (promptAdditions.length > 0) {
            await Promise.all(promptAdditions);
        }

        saveLocalCollections([]); // Clear local storage after successful merge
    } catch (error) {
        console.error("Failed to merge local collections with remote API:", error);
    }
};

export const getAllCollectionMappings = (): Promise<Record<string, number>> => externalApi.getAllCollectionMappings();

// --- Showcase Functions ---
export const getShowcaseImagesForPrompt = (promptId: string): Promise<ShowcaseImage[]> => externalApi.getShowcaseImagesForPrompt(promptId);
// FIX: Add missing re-export of 'addShowcaseImage' from externalApi.
export const addShowcaseImage = (data: Omit<ShowcaseImage, 'id' | 'createdAt'>): Promise<ShowcaseImage> => externalApi.addShowcaseImage(data);
export const deleteShowcaseImage = (imageId: string, userId: string): Promise<{ id: string }> => externalApi.deleteShowcaseImage(imageId, userId);
export const getAllShowcaseImageCounts = (): Promise<Record<string, number>> => externalApi.getAllShowcaseImageCounts();
export const getAllShowcaseImages = (): Promise<ShowcaseImage[]> => externalApi.getAllShowcaseImages();

// --- Social Functions ---
export const followUser = (currentUserId: string, targetUserId: string): Promise<void> => externalApi.followUser(currentUserId, targetUserId);
export const unfollowUser = (currentUserId: string, targetUserId: string): Promise<void> => externalApi.unfollowUser(currentUserId, targetUserId);

// --- Favorites ---
export const getUserFavorites = (uid: string): Promise<Set<string>> => externalApi.getUserFavorites(uid);
export const setUserFavorite = (uid: string, promptId: string, isFavorite: boolean, authorId?: string): Promise<void> => externalApi.setUserFavorite(uid, promptId, isFavorite, authorId);

// --- Rating Functions ---
export const getRatings = (user: AuthUser | null): Promise<Record<string, number>> => {
    // API handles guest ratings via IP, so we can pass undefined for user ID
    return externalApi.getRatings(user?.uid);
};

export const saveRating = (prompt: Prompt, rating: number, userProfile: UserProfile | null): Promise<void> => {
    return externalApi.saveRating(prompt, rating, userProfile);
};
export const getAverageRating = (promptId: string): Promise<{ average: number, count: number }> => externalApi.getAverageRating(promptId);
export const getAllAverageRatings = (): Promise<Record<string, { average: number; count: number }>> => externalApi.getAllAverageRatings();
export const getCombinedRatings = (userId?: string): Promise<{ averageRatings: Record<string, { average: number; count: number }>, userRatings: Record<string, number> }> => externalApi.getCombinedRatings(userId);

// --- Notification Functions ---
export const listenForNotifications = (userId: string, callback: (notifications: Notification[]) => void): (() => void) => externalApi.listenForNotifications(userId, callback);
export const markNotificationAsRead = (userId: string, notificationId: string, type: Notification['type']): Promise<void> => externalApi.markNotificationAsRead(userId, notificationId, type);
export const markAllNotificationsAsRead = (userId: string, type?: Notification['type']): Promise<void> => externalApi.markAllNotificationsAsRead(userId, type);
export const deleteNotification = (userId: string, notificationId: string): Promise<void> => externalApi.deleteNotification(userId, notificationId);
export const deleteAllNotifications = (userId: string): Promise<void> => externalApi.deleteAllNotifications(userId);

// --- reCAPTCHA Verification ---
export const verifyRecaptcha = (token: string, version: 'v2' | 'v3'): Promise<{ success: boolean; message?: string }> => {
    const apiUrl = getSettings().externalApiUrl;
    if (!apiUrl) throw new Error("External API URL is not configured.");
    
    // Create a new URL object from the base API URL
    const url = new URL(apiUrl);
    
    // Append search parameters
    url.searchParams.append('resource', 'recaptcha');
    
    return fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, version }),
    }).then(res => {
        if (!res.ok) {
            return res.json().then(err => { 
                throw new Error(err.message || err.error || 'reCAPTCHA verification request failed.');
            });
        }
        return res.json();
    });
};

// --- Support Ticket Functions ---
export const getTickets = (userId?: string): Promise<SupportTicket[]> => externalApi.getTickets(userId);
export const getTicket = (id: string): Promise<SupportTicket> => externalApi.getTicket(id);
export const createTicket = (data: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'messages'>): Promise<SupportTicket> => externalApi.createTicket(data);
export const updateTicketStatus = (id: string, status: SupportTicket['status']): Promise<void> => externalApi.updateTicketStatus(id, status);
export const deleteTicket = (id: string): Promise<void> => externalApi.deleteTicket(id);
export const getTicketMessages = (ticketId: string): Promise<TicketMessage[]> => externalApi.getTicketMessages(ticketId);
export const sendTicketMessage = (data: Omit<TicketMessage, 'id' | 'createdAt'>): Promise<TicketMessage> => externalApi.sendTicketMessage(data);

// --- Rewards Functions ---
export const redeemPro = (packageId: string): Promise<{ success: boolean; newPoints: number; newExpiration: string; isPro: boolean }> => externalApi.redeemPro(packageId);