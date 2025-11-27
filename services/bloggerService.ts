import { getSettings } from './settingsService';
import { fetchApi } from './api/core';

// Helper to load Google Identity Services script
const loadGoogleScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if ((window as any).google?.accounts?.oauth2) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services script.'));
        document.body.appendChild(script);
    });
};

/**
 * Initiates the Google OAuth 2.0 Authorization Code Flow.
 * This gets an authorization code which is then sent to the backend.
 * The backend exchanges this code for an Access Token and Refresh Token,
 * allowing long-term offline access for uploading images.
 */
export const authorizeBlogger = async (): Promise<void> => {
    const settings = getSettings();
    const clientId = settings.googleClientId;

    if (!clientId) {
        throw new Error("Google Client ID is not configured in settings.");
    }

    await loadGoogleScript();

    return new Promise((resolve, reject) => {
        const client = (window as any).google.accounts.oauth2.initCodeClient({
            client_id: clientId,
            // Updated scope for Google Drive File access
            scope: 'https://www.googleapis.com/auth/drive.file',
            ux_mode: 'popup',
            callback: async (response: any) => {
                if (response.error) {
                    reject(new Error(`Google Auth Error: ${response.error}`));
                    return;
                }

                const code = response.code;
                if (!code) {
                    reject(new Error("Failed to retrieve authorization code."));
                    return;
                }

                try {
                    // Send code to backend
                    await fetchApi('settings', '&action=connect_blogger', {
                        method: 'POST',
                        body: JSON.stringify({ code })
                    });
                    resolve();
                } catch (error: any) {
                    reject(error);
                }
            },
        });

        client.requestCode();
    });
};