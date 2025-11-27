
import { getSettings } from './settingsService';

interface UploadResult {
    imageUrl: string;
    videoUrl?: string;
}

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

export const uploadToBlogger = async (file: File): Promise<UploadResult> => {
    const settings = getSettings();
    const clientId = settings.googleClientId;

    if (!clientId) {
        throw new Error("Google Client ID is not configured in settings.");
    }

    await loadGoogleScript();

    return new Promise((resolve, reject) => {
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/blogger',
            callback: async (tokenResponse: any) => {
                if (tokenResponse.error) {
                    reject(new Error(`Google Auth Error: ${tokenResponse.error}`));
                    return;
                }

                const accessToken = tokenResponse.access_token;
                if (!accessToken) {
                    reject(new Error("Failed to retrieve access token."));
                    return;
                }

                try {
                    // Step 1: Prepare the file data
                    const buffer = await file.arrayBuffer();
                    const bytes = new Uint8Array(buffer);

                    // Step 2: Upload to Picasa Web Albums API (Backing storage for Blogger images)
                    // This endpoint creates a new photo in the "default" album (usually "Drop Box")
                    // It returns an Atom feed with the media info including the direct URL.
                    const uploadUrl = 'https://picasaweb.google.com/data/feed/api/user/default/albumid/default';
                    
                    const response = await fetch(uploadUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': file.type, // e.g. image/jpeg
                            'Slug': file.name,
                        },
                        body: bytes
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Blogger/Picasa Upload Failed: ${response.status} ${errorText}`);
                    }

                    const responseText = await response.text();
                    
                    // Step 3: Parse XML response to extract the image URL
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(responseText, "text/xml");
                    
                    // The direct image URL is usually in <content src="...">
                    const contentNode = xmlDoc.getElementsByTagName('content')[0];
                    let imageUrl = contentNode ? contentNode.getAttribute('src') : null;

                    // Fallback: try getting media:content url
                    if (!imageUrl) {
                         const mediaContent = xmlDoc.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')[0];
                         if (mediaContent) {
                             imageUrl = mediaContent.getAttribute('url');
                         }
                    }

                    if (imageUrl) {
                        resolve({ imageUrl });
                    } else {
                        reject(new Error("Could not extract image URL from Blogger response."));
                    }

                } catch (error: any) {
                    reject(error);
                }
            },
        });

        // Request token (triggers popup)
        tokenClient.requestAccessToken();
    });
};
