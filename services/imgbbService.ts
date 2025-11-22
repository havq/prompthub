import { getSettings } from './settingsService';

interface ImgbbResponse {
    data: {
        id: string;
        url: string;
        display_url: string;
        [key: string]: any;
    };
    success: boolean;
    status: number;
}

interface UploadResult {
    imageUrl: string;
    videoUrl?: string;
}

export const uploadToImgbb = async (imageFile: File): Promise<UploadResult> => {
    const settings = getSettings();
    const activeKeys = (settings.imgbbApiKeys || []).filter(k => k.enabled && k.key);
    
    if (activeKeys.length === 0) {
        throw new Error("ImgBB API key is not configured or enabled in the admin settings.");
    }

    const apiKey = activeKeys[Math.floor(Math.random() * activeKeys.length)].key;
    
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
            throw new Error(`ImgBB API error: ${errorData.error?.message || response.statusText}`);
        }

        const result: ImgbbResponse = await response.json();

        if (result.success && result.data.url) {
            const isVideo = imageFile.type.startsWith('video/');
            if (isVideo) {
                return { imageUrl: '', videoUrl: result.data.url };
            } else {
                return { imageUrl: result.data.url };
            }
        } else {
            throw new Error('Failed to upload image to ImgBB. The response was not successful.');
        }
    } catch (error) {
        console.error("Error uploading to ImgBB:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred during ImgBB upload.");
    }
};