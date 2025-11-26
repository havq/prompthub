
import { getSettings } from './settingsService';
import { uploadToImgbb } from './imgbbService';
import { uploadToCloudinary } from './cloudinaryService'; // We will override the export here locally or update logic
import { UploadMethod, WatermarkSettings } from '../utils/types';
import { fetchApi } from './api/core';

// Helper to get reCAPTCHA token
const getRecaptchaToken = async (action: string): Promise<string | null> => {
    const settings = getSettings();
    const recaptcha = settings.recaptchaSettings;

    // Only proceed if enabled and using v3 (v2 checkbox isn't suitable for invisible background actions like upload)
    if (!recaptcha?.enabled || recaptcha.version !== 'v3' || !recaptcha.v3SiteKey) {
        return null;
    }

    return new Promise((resolve) => {
        const checkGrecaptcha = () => {
            // @ts-ignore
            if (window.grecaptcha && window.grecaptcha.execute) {
                // @ts-ignore
                window.grecaptcha.execute(recaptcha.v3SiteKey, { action })
                    .then((token: string) => resolve(token))
                    .catch((err: any) => {
                        console.error("reCAPTCHA execution failed:", err);
                        resolve(null); // Fail open on client error, let backend decide
                    });
            } else {
                // If script isn't loaded yet, wait a bit or fail gracefully
                // In a real app, you might want to dynamically load the script here if missing
                console.warn("reCAPTCHA script not loaded.");
                resolve(null);
            }
        };

        if ((window as any).grecaptcha) {
            checkGrecaptcha();
        } else {
            // Simple retry mechanism if script is loading
            setTimeout(checkGrecaptcha, 1000);
        }
    });
};

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
        // Get Recaptcha Token
        const recaptchaToken = await getRecaptchaToken('upload_r2');
        const headers: HeadersInit = {};
        if (recaptchaToken) {
            headers['X-Recaptcha-Token'] = recaptchaToken;
        }

        // Step 1: Request a presigned URL from the backend.
        // fetchApi automatically handles Authorization header
        const presignedUrlResponse = await fetchApi<{ uploadUrl: string; finalUrl: string }>(
            'upload', 
            '&action=generate-r2-presigned-url', 
            {
                method: 'POST',
                headers: headers,
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
        // Note: We do NOT send the recaptcha token or Auth token to R2, only to our backend.
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


const applyWatermark = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const settings = getSettings().watermarkSettings;
        if (!settings || !settings.enabled) {
            resolve(file);
            return;
        }

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
                ctx.globalAlpha = settings.opacity / 100;
                
                const finalizeAndResolve = () => {
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(new File([blob], file.name, { type: file.type }));
                        } else {
                            reject(new Error("Canvas to Blob conversion failed."));
                        }
                    }, file.type);
                };

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
                            console.error("Failed to load watermark logo image. Skipping watermark.");
                            resolve(file);
                        };
                        logo.src = settings.logoUrl;
                    } else if (settings.text) {
                        const fontSize = Math.max(12, img.width * (settings.size / 100) / 5); // Heuristic
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
                        finalizeAndResolve();
                    } else {
                        resolve(file);
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
                            console.error("Failed to load watermark logo image. Skipping watermark.");
                            resolve(file);
                        };
                        logo.src = settings.logoUrl;
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
                        finalizeAndResolve();
                    } else {
                        resolve(file);
                    }
                }
            };
            img.onerror = () => reject(new Error("Failed to load image for watermarking."));
            img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Failed to read file for watermarking."));
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

// Re-implementing local versions of server/cloudinary upload to inject headers
const uploadToServer = async (imageFile: File): Promise<UploadResult> => {
    const settings = getSettings();
    if (!settings.externalApiUrl) throw new Error("External API URL is not configured.");
    const uploadUrl = `${settings.externalApiUrl}?resource=upload`;
    const formData = new FormData();
    formData.append('image', imageFile);

    const recaptchaToken = await getRecaptchaToken('upload_server');
    const authToken = localStorage.getItem('auth_token');
    
    const headers: HeadersInit = {};
    if (recaptchaToken) headers['X-Recaptcha-Token'] = recaptchaToken;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(uploadUrl, { method: 'POST', body: formData, headers });
    if (!response.ok) {
        try {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Server upload failed.');
        } catch (e) {
            throw new Error(`Server upload failed: ${response.statusText}`);
        }
    }
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result;
};

const uploadToCloudinaryProxy = async (imageFile: File): Promise<UploadResult> => {
    const settings = getSettings();
    if (!settings.externalApiUrl) throw new Error("External API URL is not configured.");
    const uploadUrl = `${settings.externalApiUrl}?resource=upload&provider=cloudinary`;
    const formData = new FormData();
    formData.append('image', imageFile);

    const recaptchaToken = await getRecaptchaToken('upload_cloudinary');
    const authToken = localStorage.getItem('auth_token');

    const headers: HeadersInit = {};
    if (recaptchaToken) headers['X-Recaptcha-Token'] = recaptchaToken;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(uploadUrl, { method: 'POST', body: formData, headers });
    if (!response.ok) {
        try {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Cloudinary upload failed.');
        } catch (e) {
            throw new Error(`Cloudinary upload failed: ${response.statusText}`);
        }
    }
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result;
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

    // Check if watermarking should be applied for this image and method
    if (mediaType === 'image' && watermarkSettings?.enabled && watermarkSettings.applyTo?.includes(method) && method !== 'base64') {
        try {
            fileToUpload = await applyWatermark(file);
        } catch (error) {
            console.error("Failed to apply watermark, uploading original image instead.", error);
            // Fallback to original file if watermarking fails
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
        return uploadToServer(fileToUpload);
    }

    if (method === 'imgbb') {
        return uploadToImgbb(fileToUpload);
    }
    
    if (method === 'cloudinary') {
        return uploadToCloudinaryProxy(fileToUpload);
    }
    
    // Default to base64
    return uploadAsBase64(fileToUpload);
};
