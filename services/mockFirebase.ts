


import { Prompt, Category, Comment, Report, UserProfile, Collection, ShowcaseImage, Notification, Badge, StaticPage, NotificationType, NotificationSettings, CategoryWithCount, TopContributor, Post, PostComment, PostCategory, PostCategoryWithCount } from '../types';
import firebase from 'firebase/compat/app';
// FIX: Add import for GetPromptsParams and GetPromptsResponse to support paginated/filtered prompt fetching.
import { GetPromptsParams, GetPromptsResponse } from './externalApi';

let prompts: Prompt[] = [];
let posts: Post[] = [];
let postComments: PostComment[] = [];
let categories: Category[] = [];
let postCategories: PostCategory[] = [];
let comments: Comment[] = [];
let users: UserProfile[] = [];
let collections: Collection[] = [];
let guestCollections: Collection[] = []; // For guest users, in-memory
let showcaseImages: ShowcaseImage[] = [];
let notifications: Notification[] = [];
let notificationListeners: Function[] = [];
let staticPages: StaticPage[] = [];
let reports: Report[] = [];
let userRatings: Record<string, Record<string, number>> = {}; // { userId: { promptId: rating } }
let userFavorites: Record<string, Record<string, boolean>> = {}; // { userId: { promptId: true } }


const fetchJson = async <T,>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    return response.json();
};

export const initializeDatabase = async () => {
    try {
        categories = await fetchJson<Category[]>('/database/categories.json');
        postCategories = await fetchJson<PostCategory[]>('/database/post_categories.json');
        comments = await fetchJson<Comment[]>('/database/comments.json');
        postComments = await fetchJson<PostComment[]>('/database/post_comments.json');
        posts = await fetchJson<Post[]>('/database/posts.json');
        
        const commentCounts: Record<string, number> = {};
        comments.forEach(c => {
            commentCounts[c.promptId] = (commentCounts[c.promptId] || 0) + 1;
        });

        posts.forEach(post => {
            post.commentCount = postComments.filter(c => c.postId === post.id).length;
        });

        const rawPrompts = await fetchJson<any[]>('/database/prompts.json');
        prompts = rawPrompts.map(p => {
            const categoryIds = p.categoryIds || p.folderIds || (p.folderId ? [p.folderId] : []);
            delete p.folderId;
            delete p.folderIds;
            const createdAt = p.createdAt || new Date(parseInt(p.id, 10)).toISOString();
            const tags = p.tags || [];
            const remixCount = p.remixCount || 0;
            const commentCount = commentCounts[p.id] || 0;
            const commentsEnabled = p.commentsEnabled ?? true;
            const referenceImageUrl = p.referenceImageUrl || undefined;
            const videoUrl = p.videoUrl || undefined;
            const requiresUserImage = p.requiresUserImage || false;
            const isPrivate = p.isPrivate || false;
            const isNSFW = p.isNSFW || false;
            const status = p.status || 'approved';
            const viewCount = p.viewCount || Math.floor(Math.random() * 10000);
            const rotation = p.rotation || 0;
            const text = String(p.text || '');
            const title = String(p.title || (text ? text.substring(0, 50) + '...' : 'Untitled Prompt'));
            return { ...p, text, title, categoryIds, createdAt, tags, remixCount, commentCount, commentsEnabled, referenceImageUrl, videoUrl, requiresUserImage, isPrivate, isNSFW, status, viewCount, rotation };
        });

        reports = [
            { id: 'rep-1', promptId: '1001', promptText: '...', reason: 'spam', details: 'Spam content', createdAt: new Date().toISOString(), status: 'pending' }
        ];
        
        staticPages = [
             { id: 'page-1', title: 'About Us', slug: 'about', content: '<h1>About Us</h1><p>Welcome to Prompthub.</p>', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
             { id: 'page-2', title: 'Terms of Use', slug: 'terms-of-use', content: '<h1>Terms of Use</h1><p>Terms content...</p>', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
             { id: 'page-3', title: 'Privacy Policy', slug: 'privacy-policy', content: '<h1>Privacy Policy</h1><p>Privacy content...</p>', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        ];

    } catch (error) {
        console.error("Failed to initialize mock database:", error);
    }
};

// --- Prompt Functions ---

export const getPrompts = async (params: GetPromptsParams): Promise<GetPromptsResponse> => {
    let filtered = [...prompts];

    if (!params.isAdmin) {
        // Filter out private prompts unless requested by the author
        // Filter out non-approved prompts unless requested by the author
        // In mock mode, we simulate "author requesting" by checking if an 'author' param matches 'mock-user-id' or similar, 
        // but generally for public feed, hide private/pending.
        
        if (params.author) {
             // If requesting specific author, allow pending/private if it matches current user (mocking current user logic is tricky here without context, so let's assume public view for now unless specific)
             // For simplicity in mock:
             filtered = filtered.filter(p => p.authorId === params.author);
             // If it's the author viewing their own profile, they should see pending/private. 
             // We can't easily detect "current user" here in mock without passing it. 
             // Let's assume if author param is present, we show all their prompts.
        } else {
             // Public feed: approved and public only
             filtered = filtered.filter(p => !p.isPrivate && p.status === 'approved');
        }
    }

    if (params.searchTerm) {
        const term = params.searchTerm.toLowerCase();
        filtered = filtered.filter(p => 
            p.text.toLowerCase().includes(term) || 
            p.title?.toLowerCase().includes(term) ||
            p.tags?.some(t => t.toLowerCase().includes(term)) ||
            p.authorName?.toLowerCase().includes(term)
        );
    }

    if (params.category && params.category !== 'All') {
        filtered = filtered.filter(p => p.categoryIds.includes(params.category!));
    }

    if (params.tag) {
        filtered = filtered.filter(p => p.tags?.includes(params.tag!));
    }
    
    if (params.date && params.date !== 'all') {
        const now = new Date();
        let threshold = new Date(0); // Default to epoch
        if (params.date === '24h') threshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        if (params.date === '7d') threshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (params.date === '30d') threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        filtered = filtered.filter(p => new Date(p.createdAt) >= threshold);
    }

    if (params.commentFilter && params.commentFilter !== 'any') {
         filtered = filtered.filter(p => params.commentFilter === 'yes' ? (p.commentCount || 0) > 0 : (p.commentCount || 0) === 0);
    }

    if (params.remixFilter && params.remixFilter !== 'any') {
         filtered = filtered.filter(p => params.remixFilter === 'yes' ? (p.remixCount || 0) > 0 : (!p.remixCount));
    }

    if (params.referenceImageFilter && params.referenceImageFilter !== 'any') {
         filtered = filtered.filter(p => params.referenceImageFilter === 'yes' ? !!p.referenceImageUrl : !p.referenceImageUrl);
    }

    if (params.nsfwFilter && params.nsfwFilter !== 'any') {
        const wantNSFW = params.nsfwFilter === 'yes';
        filtered = filtered.filter(p => !!p.isNSFW === wantNSFW);
    }

    // Sort
    if (params.sortBy === 'oldest') {
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (params.sortBy === 'views') {
        filtered.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    } else if (params.sortBy === 'comments') {
        filtered.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
    } else if (params.sortBy === 'remixes') {
        filtered.sort((a, b) => (b.remixCount || 0) - (a.remixCount || 0));
    } else { // Newest default
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const total = filtered.length;
    const start = (params.page - 1) * params.limit;
    const paginated = filtered.slice(start, start + params.limit);

    // Calculate category counts for the first page
    let categoryCounts: Record<string, number> | undefined;
    if (params.page === 1) {
        categoryCounts = {};
        // Count based on *all* accessible prompts (filtered by status/privacy but not other filters? usually filters apply)
        // Let's count based on the *current filter context* for relevant counts.
        filtered.forEach(p => {
             p.categoryIds.forEach(cid => {
                 categoryCounts![cid] = (categoryCounts![cid] || 0) + 1;
             });
        });
    }

    return {
        prompts: paginated,
        total,
        allTags: Array.from(new Set(prompts.flatMap(p => p.tags || []))).sort(),
        categoryCounts
    };
};
// ... (rest of the file remains unchanged)
