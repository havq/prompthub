
import { AppSettings, StaticPage } from '../../utils/types';
import { fetchApi, mapItem, mapItems } from './core';

// --- App Settings ---
export const getAppSettings = (): Promise<Partial<AppSettings>> => {
  return fetchApi<Partial<AppSettings>>('settings');
};

export const saveAppSettings = (settings: Partial<Omit<AppSettings, 'firebaseConfig' | 'adminPassword'>>): Promise<void> => {
    const settingsToSend: Record<string, any> = { ...settings };

    const keysToStringify: (keyof AppSettings)[] = [
        'footerSocialLinks', 'footerLinks', 'navigationMenu', 'cloudinaryConfigs',
        'adSettings', 'overlayAdSettings', 'topBannerAdSettings', 'bottomBannerAdSettings',
        'promptDetailAdSettings', 'customBadgeIcons'
    ];

    keysToStringify.forEach(key => {
        const keyString = key as string;
        if (keyString in settingsToSend && typeof settingsToSend[keyString] === 'object' && settingsToSend[keyString] !== null) {
            settingsToSend[keyString] = JSON.stringify(settingsToSend[keyString]);
        }
    });

    return fetchApi<void>('settings', '', { method: 'PUT', body: JSON.stringify(settingsToSend) });
};

// --- Tags ---
export const getTags = (): Promise<string[]> => fetchApi<string[]>('tags');

// --- Static Page Functions ---
export const getStaticPages = (): Promise<StaticPage[]> => fetchApi<StaticPage[]>('staticPages').then(mapItems);
export const addStaticPage = (data: Omit<StaticPage, 'id' | 'createdAt'>): Promise<StaticPage> => fetchApi<StaticPage>('staticPages', '', { method: 'POST', body: JSON.stringify(data) }).then(mapItem);
export const updateStaticPage = (data: StaticPage): Promise<StaticPage> => fetchApi<StaticPage>('staticPages', `&id=${data.id}`, { method: 'PUT', body: JSON.stringify(data) }).then(() => data);
export const deleteStaticPage = (id: string): Promise<{ id: string }> => fetchApi<{ id: string }>('staticPages', `&id=${id}`, { method: 'DELETE' });

// --- reCAPTCHA Verification ---
export const verifyRecaptcha = (token: string, version: 'v2' | 'v3'): Promise<{ success: boolean; message?: string }> => {
    return fetchApi<{ success: boolean; message?: string }>('recaptcha', '', { 
        method: 'POST', 
        body: JSON.stringify({ token, version }) 
    });
};