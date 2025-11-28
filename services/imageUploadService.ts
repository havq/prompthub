
import { getSettings } from './settingsService';
import { uploadToImgbb } from './imgbbService';
import { uploadToCloudinary } from './cloudinaryService'; // We will override the export here locally or update logic
import { UploadMethod, WatermarkSettings } from '../utils/types';
import { fetchApi } from './api/core';
import { uploadToServer as uploadToServerProxy } from './serverUploadService';

interface UploadResult {
    imageUrl: string;
    videoUrl?: string;
}

export const uploadToR2 = async (file: File): Promise<UploadResult> => {
    const settings = getSettings();
    const activeConfigs = (settings.r2Configs || []).filter(c => c.enabled);
    
    if (activeConfigs.length === 0) {
        throw new Error("Cloudflare R2 is not configured or enabled in the admin settings.");
    }
    
    // Use the first enabled config for simplicity.
    const config = activeConfigs[0];
    
    try {
        // Step 1: Request a presigned URL from the backend.
        // fetchApi automatically handles Authorization header
        const presignedUrlResponse = await fetchApi<{ uploadUrl: string; finalUrl: string }>(
            'upload', 
            '&action=generate-r2-presigned-url', 
            {
                method: 'POST',
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type,
                    configId: config.id
                })
            }
        );

        if (!presignedUrlResponse.uploadUrl || !presignedUrlResponse.finalUrl) {
            throw new Error("Failed to get a presigned URL from the server.");
        }

        // Step 2: Upload the file directly to R2 using the presigned URL.
        // Note: We do NOT send Auth token to R2, only to our backend.
        const uploadResponse = await fetch(presignedUrlResponse.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Failed to upload to Cloudflare R2: ${uploadResponse.status} ${errorText}`);
        }
        
        // Step 3: Return the final public URL.
        const isVideo = file.type.startsWith('video/');
        return {
            imageUrl: isVideo ? '' : presignedUrlResponse.finalUrl,
            videoUrl: isVideo ? presignedUrlResponse.finalUrl : undefined
        };

    } catch (error) {
        console.error("Error during Cloudflare R2 upload process:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred during R2 upload.");
    }
};

// Helper to convert any image to WebP
const convertToWebP = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        // If it's already WebP, resolve immediately
        if (file.type === 'image/webp') {
            resolve(file);
            return;
        }

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("Could not get canvas context for WebP conversion."));
                return;
            }

            ctx.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
                URL.revokeObjectURL(objectUrl);
                if (blob) {
                    // Smart Optimization Check:
                    // If the converted WebP is larger than the original file, discard the conversion
                    // and use the original file. This prevents file size inflation on already compressed images.
                    if (blob.size > file.size) {
                         console.log(`WebP conversion resulted in larger file (${blob.size} vs ${file.size}). Keeping original.`);
                         resolve(file);
                         return;
                    }

                    const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                    resolve(new File([blob], newName, { type: 'image/webp' }));
                } else {
                    reject(new Error("WebP conversion failed."));
                }
            }, 'image/webp', 0.85); // Quality 0.85
        };

        img.onerror = (e) => {
            URL.revokeObjectURL(objectUrl);
            console.error("Failed to load image for WebP conversion", e);
            // Return original file if conversion fails to ensure upload doesn't break
            resolve(file); 
        };

        img.src = objectUrl;
    });
};

const applyWatermark = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const settings = getSettings().watermarkSettings;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get canvas context."));
                    return;
                }

                // 1. Draw the original image
                ctx.drawImage(img, 0, 0);

                // 2. Prepare watermark
                if (settings && settings.enabled) {
                    ctx.globalAlpha = settings.opacity / 100;
                    
                    // 3. Apply logo or text
                    if (settings.repeat) {
                        if (settings.logoUrl) {
                            const logo = new Image();
                            logo.crossOrigin = "Anonymous";
                            logo.onload = () => {
                                const logoWidth = img.width * (settings.size / 100);
                                const logoHeight = logo.height * (logoWidth / logo.width);
                                const stepX = logoWidth * 2.5;
                                const stepY = logoHeight * 3;

                                for (let y = -stepY; y < canvas.height + stepY; y += stepY) {
                                    for (let x = -stepX; x < canvas.width + stepX; x += stepX) {
                                        const offsetX = (Math.floor(y / stepY) % 2) * (stepX / 2);
                                        ctx.save();
                                        ctx.translate(x + offsetX, y);
                                        ctx.rotate(-Math.PI / 6); // -30 degrees
                                        ctx.drawImage(logo, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);
                                        ctx.restore();
                                    }
                                }
                                finalizeAndResolve();
                            };
                            logo.onerror = () => {
                                console.error("Failed to load watermark logo image. Proceeding without logo.");
                                finalizeAndResolve();
                            };
                            logo.src = settings.logoUrl;
                            return; // Wait for logo load
                        } else if (settings.text) {
                            const fontSize = Math.max(12, img.width * (settings.size / 100) / 5); 
                            ctx.font = `bold ${fontSize}px Arial`;
                            ctx.fillStyle = "rgba(255, 255, 255, 1)";
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
                            ctx.shadowBlur = 5;

                            const textMetrics = ctx.measureText(settings.text);
                            const stepX = textMetrics.width * 2;
                            const stepY = fontSize * 5;

                            for (let y = -stepY; y < canvas.height + stepY; y += stepY) {
                                for (let x = -stepX; x < canvas.width + stepX; x += stepX) {
                                     const offsetX = (Math.floor(y / stepY) % 2) * (stepX / 2);
                                    ctx.save();
                                    ctx.translate(x + offsetX, y);
                                    ctx.rotate(-Math.PI / 6); // -30 degrees
                                    ctx.fillText(settings.text, 0, 0);
                                    ctx.restore();
                                }
                            }
                        }
                    } else { // Single placement logic
                        if (settings.logoUrl) {
                            const logo = new Image();
                            logo.crossOrigin = "Anonymous";
                            logo.onload = () => {
                                const logoWidth = img.width * (settings.size / 100);
                                const logoHeight = logo.height * (logoWidth / logo.width);
                                const { x, y } = getWatermarkPosition(img.width, img.height, logoWidth, logoHeight, settings.position);
                                ctx.drawImage(logo, x, y, logoWidth, logoHeight);
                                finalizeAndResolve();
                            };
                            logo.onerror = () => {
                                console.error("Failed to load watermark logo image. Proceeding without logo.");
                                finalizeAndResolve();
                            };
                            logo.src = settings.logoUrl;
                            return; // Wait for logo load
                        } else if (settings.text) {
                            const fontSize = img.width * (settings.size / 100) / 5;
                            ctx.font = `bold ${fontSize}px Arial`;
                            ctx.fillStyle = "rgba(255, 255, 255, 1)";
                            ctx.textAlign = 'left';
                            ctx.textBaseline = 'top';
                            
                            const textMetrics = ctx.measureText(settings.text);
                            const { x, y } = getWatermarkPosition(img.width, img.height, textMetrics.width, fontSize, settings.position);

                            ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
                            ctx.shadowBlur = 5;
                            ctx.shadowOffsetX = 2;
                            ctx.shadowOffsetY = 2;
                            
                            ctx.fillText(settings.text, x, y);
                        }
                    }
                }

                finalizeAndResolve();

                function finalizeAndResolve() {
                    // Always convert to WebP when applying watermark
                    // Note: When watermarking, we generally accept size increase as the image content has changed.
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                            resolve(new File([blob], newName, { type: 'image/webp' }));
                        } else {
                            reject(new Error("Canvas to Blob conversion failed."));
                        }
                    }, 'image/webp', 0.85); // Quality 0.85
                }
            };
            img.onerror = () => reject(new Error("Failed to load image for processing."));
            img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Failed to read file for processing."));
        reader.readAsDataURL(file);
    });
};

const getWatermarkPosition = (imgWidth: number, imgHeight: number, wmWidth: number, wmHeight: number, position: WatermarkSettings['position']) => {
    const margin = imgWidth * 0.02; // 2% margin
    let x, y;
    switch (position) {
        case 'top-left':     x = margin; y = margin; break;
        case 'top-right':    x = imgWidth - wmWidth - margin; y = margin; break;
        case 'bottom-left':  x = margin; y = imgHeight - wmHeight - margin; break;
        case 'center':       x = (imgWidth - wmWidth) / 2; y = (imgHeight - wmHeight) / 2; break;
        case 'bottom-right':
        default:             x = imgWidth - wmWidth - margin; y = imgHeight - wmHeight - margin; break;
    }
    return { x, y };
};

const uploadAsBase64 = (file: File): Promise<UploadResult> => {
    return new Promise<UploadResult>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                if (file.type.startsWith('video/')) {
                    resolve({ imageUrl: '', videoUrl: reader.result });
                } else {
                    resolve({ imageUrl: reader.result });
                }
            } else {
                reject(new Error("Failed to read file as Base64 data URL."));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

// Helper to upload to server via the generic upload endpoint, specifying provider
const uploadToServer = async (imageFile: File, provider?: string): Promise<UploadResult> => {
    const settings = getSettings();
    if (!settings.externalApiUrl) throw new Error("External API URL is not configured.");
    
    let uploadUrl = `${settings.externalApiUrl}?resource=upload`;
    if (provider) {
        uploadUrl += `&provider=${provider}`;
    }

    const formData = new FormData();
    formData.append('image', imageFile);
    
    const authToken = localStorage.getItem('auth_token');
    
    const headers: HeadersInit = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(uploadUrl, { method: 'POST', body: formData, headers });
    if (!response.ok) {
        try {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed.');
        } catch (e) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
    }
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result;
};

// Re-implementing local versions of Cloudinary upload to inject headers
const uploadToCloudinaryProxy = async (imageFile: File): Promise<UploadResult> => {
    return uploadToServer(imageFile, 'cloudinary');
};

import { uploadToTumblr } from './tumblrService'; // Tumblr uses external client, handled separately or updated similarly

export const getUploadMethodsForRole = (
  mediaType: 'image' | 'video',
  roleInfo?: { isPro?: boolean; isAdmin?: boolean }
): UploadMethod[] => {
    const settings = getSettings();

    const adminKey = mediaType === 'video' ? 'videoUploadMethod' : 'imageUploadMethod';
    const userKey = mediaType === 'video' ? 'userVideoUploadMethod' : 'userImageUploadMethod';
    const proKey = mediaType === 'video' ? 'proVideoUploadMethod' : 'proImageUploadMethod';
  
    const adminMethods = Array.isArray(settings[adminKey]) ? settings[adminKey]! : [];
    const userMethods = Array.isArray(settings[userKey]) ? settings[userKey]! : [];
    const proMethods = Array.isArray(settings[proKey]) ? settings[proKey]! : [];
    
    const fallback: UploadMethod[] = ['server'];

    if (!roleInfo || roleInfo.isAdmin) {
        return adminMethods.length > 0 ? adminMethods : fallback;
    }
    
    if (roleInfo.isPro) {
        if (proMethods.length > 0) return proMethods;
        if (userMethods.length > 0) return userMethods;
        return adminMethods.length > 0 ? adminMethods : fallback;
    }
    
    // Regular User
    if (userMethods.length > 0) {
        return userMethods;
    }

    // For video, if no specific user methods are set, they get no methods.
    if (mediaType === 'video') {
        return [];
    }
    
    // For images, they can still fall back to admin methods.
    return adminMethods.length > 0 ? adminMethods : fallback;
};


export const uploadImage = async (file: File, methodOverride?: UploadMethod, roleInfo?: { isPro?: boolean; isAdmin?: boolean }): Promise<UploadResult> => {
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
    let method: UploadMethod;
    
    if (methodOverride) {
        method = methodOverride;
    } else {
        const availableMethods = getUploadMethodsForRole(mediaType, roleInfo);
        if (availableMethods.length === 0) {
            // If no methods are available (e.g., regular user with video uploads disabled), throw an error.
            throw new Error(`No upload methods available for your user role and file type (${mediaType}).`);
        } else {
            // Randomly select one method
            method = availableMethods[Math.floor(Math.random() * availableMethods.length)];
        }
    }

    let fileToUpload = file;
    const settings = getSettings();
    const watermarkSettings = settings.watermarkSettings;

    // Handle Image Processing (Watermark OR WebP Conversion)
    if (mediaType === 'image' && method !== 'base64') {
        try {
            // Check if watermarking is enabled and applies to this method
            if (watermarkSettings?.enabled && watermarkSettings.applyTo?.includes(method)) {
                // applyWatermark now handles WebP conversion as well
                fileToUpload = await applyWatermark(file);
            } else {
                // If no watermark, simply convert to WebP for optimization
                // But check if conversion actually saves space
                fileToUpload = await convertToWebP(file);
            }
        } catch (error) {
            console.error("Image processing failed, falling back to original file.", error);
            // Fallback to original file if processing fails
            fileToUpload = file;
        }
    }

    if (method === 'r2') {
        return uploadToR2(fileToUpload);
    }

    if (method === 'tumblr') {
        return uploadToTumblr(fileToUpload);
    }

    if (method === 'server') {
        return uploadToServer(fileToUpload, 'server');
    }

    if (method === 'imgbb') {
        return uploadToImgbb(fileToUpload);
    }
    
    if (method === 'cloudinary') {
        return uploadToCloudinaryProxy(fileToUpload);
    }

    if (method === 'blogger') {
        // Use server-side proxy for Blogger upload to use stored tokens
        return uploadToServer(fileToUpload, 'blogger');
    }

    if (method === 'imgbox') {
        return uploadToServer(fileToUpload, 'imgbox');
    }
    
    // Default to base64
    return uploadAsBase64(fileToUpload);
};
