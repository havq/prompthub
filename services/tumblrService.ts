import { getSettings } from './settingsService';

interface UploadResponse {
    imageUrl: string;
    videoUrl?: string;
    error?: string;
}

export const uploadToTumblr = async (imageFile: File): Promise<UploadResponse> => {
    const apiUrl = getSettings().externalApiUrl;
    if (!apiUrl) {
        throw new Error("External API URL is not configured.");
    }
    
    // The provider parameter tells the backend which service to use
    const uploadUrl = `${apiUrl}?resource=upload&provider=tumblr`;

    const formData = new FormData();
    formData.append('image', imageFile);

    try {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            let errorMessage = `Tumblr upload failed with status ${response.status}`;
            try {
                const errorResult: UploadResponse = await response.json();
                if (errorResult.error) {
                    errorMessage = errorResult.error;
                }
            } catch (e) {
                const errorText = await response.text();
                if (errorText) {
                    errorMessage = errorText;
                }
            }
            throw new Error(errorMessage);
        }
        
        const responseText = await response.text();
        if (!responseText) {
            throw new Error("Server returned a successful response but the body was empty.");
        }

        try {
            const result: UploadResponse = JSON.parse(responseText);
            if (result.imageUrl || result.videoUrl) {
                return result;
            } else {
                throw new Error(result.error || 'Tumblr upload failed: URL not found in response.');
            }
        } catch (e) {
            console.error("Failed to parse server response as JSON. Body:", responseText);
            throw new Error(`Failed to parse server response. The server sent: ${responseText.substring(0, 200)}...`);
        }
    } catch (error) {
        console.error("Error uploading to Tumblr via server:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred during Tumblr upload.");
    }
};