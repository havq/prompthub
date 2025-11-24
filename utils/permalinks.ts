import { getSettings } from '../services/settingsService';
import { PermalinkSettings } from '../utils/types';

const defaultPermalinks: Required<PermalinkSettings> = {
    prompt: 'prompt/%{promptId}%',
    post: 'post/%{postId}%',
    reel: 'reels/%{reelId}%',
    promptCategory: 'category/%{categoryId}%',
    postCategory: 'posts/category/%{categoryId}%',
    reelCategory: 'reels/category/%{categoryId}%',
    tag: 'tag/%{tag}%',
    author: 'author/%{authorId}%',
    search: 'search/%{searchTerm}%',
    postSearch: 'posts/search/%{searchTerm}%',
    reelSearch: 'reels/search/%{searchTerm}%',
    reelsExplore: 'reels/explore',
    prompts: 'prompts',
    promptsList: 'prompts-list',
    community: 'community'
};

/**
 * Converts a permalink template string into a react-router compatible path string.
 * Example: 'prompt/%{promptId}%' becomes 'prompt/:promptId'
 * @param template The permalink template string.
 * @returns A path string for use in <Route path="...">.
 */
export function buildRoutePath(template: string): string {
    if (!template) return '';
    return template.replace(/%\{([^}]+)\}%/g, ':$1');
}

/**
 * Builds a URL for a specific content type using the configured permalink structure.
 * @param type The type of content (e.g., 'prompt', 'post').
 * @param params An object containing the values for the variables in the permalink.
 * @returns A fully constructed URL path (e.g., '/prompt/123').
 */
export function buildUrl(type: keyof PermalinkSettings, params: Record<string, string | number>): string {
    const settings = getSettings();
    const template = settings.permalinkSettings?.[type] || defaultPermalinks[type];

    let url = template;
    for (const key in params) {
        url = url.replace(`%{${key}}%`, String(params[key]));
    }
    
    // Ensure the URL starts with a slash
    return url.startsWith('/') ? url : `/${url}`;
}
