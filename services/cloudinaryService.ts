
import { getSettings } from './settingsService';

interface UploadResult {
    imageUrl: string;
    videoUrl?: string;
}

export const uploadToCloudinary = async (imageFile: File): Promise<UploadResult> => {
    const settings = getSettings();
    const apiUrl = settings.externalApiUrl;
    if (!apiUrl) {
        throw new Error("External API URL is not configured.");
    }

    // Use the backend proxy instead of direct Cloudinary upload
    const uploadUrl = `${apiUrl}?resource=upload&provider=cloudinary`;

    const formData = new FormData();
    formData.append('image', imageFile);

    try {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            // Do not set Content-Type header when using FormData, the browser will set it with the boundary.
        });

        if (!response.ok) {
            let errorMessage = `Cloudinary proxy upload failed with status ${response.status}`;
            try {
                // Try to get JSON error from backend
                const errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // Fallback to text
                const text = await response.text();
                if (text) errorMessage = text;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        if (result.imageUrl || result.videoUrl) {
            return result;
        } else {
            throw new Error('Invalid response from server for Cloudinary upload.');
        }
    } catch (error) {
        console.error("Error uploading to Cloudinary via proxy:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred during Cloudinary upload.");
    }
};
