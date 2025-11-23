
import { getSettings } from './settingsService';

interface CloudinaryResponse {
    secure_url: string;
    [key: string]: any;
}

interface UploadResult {
    imageUrl: string;
    videoUrl?: string;
}

export const uploadToCloudinary = async (imageFile: File): Promise<UploadResult> => {
    const settings = getSettings();
    const activeConfigs = (settings.cloudinaryConfigs || []).filter(c => c.enabled && c.cloudName && c.uploadPreset);

    if (activeConfigs.length === 0) {
        throw new Error("Cloudinary is not configured. Please set a Cloud Name and Upload Preset in admin settings.");
    }

    const { cloudName, uploadPreset } = activeConfigs[Math.floor(Math.random() * activeConfigs.length)];
    const isVideo = imageFile.type.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    // Trim whitespace to prevent "Upload preset not found" errors
    const cleanCloudName = cloudName.trim();
    const cleanUploadPreset = uploadPreset.trim();

    const url = `https://api.cloudinary.com/v1_1/${cleanCloudName}/${resourceType}/upload`;
    
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('upload_preset', cleanUploadPreset);

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
            throw new Error(`Cloudinary API error: ${errorData.error?.message || response.statusText}`);
        }

        const result: CloudinaryResponse = await response.json();
        
        if (result.secure_url) {
            if (isVideo) {
                return { imageUrl: '', videoUrl: result.secure_url };
            }
            return { imageUrl: result.secure_url };
        } else {
            throw new Error('Failed to upload image to Cloudinary. The response did not contain a secure_url.');
        }
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred during Cloudinary upload.");
    }
};
