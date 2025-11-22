/**
 * Transforms a Cloudinary URL to apply specified transformations for optimization.
 * This function specifically handles replacing the version number if it exists.
 * It also avoids adding transformations if they already exist.
 * @param url The original Cloudinary image URL.
 * @param transformation The transformation string (e.g., 'w_260,h_360,c_fill').
 * @returns The transformed URL, or the original URL if it's not a valid Cloudinary URL.
 */
export const transformCloudinaryUrl = (url: string, transformation: string): string => {
    if (!url || !url.includes('res.cloudinary.com/')) {
        return url;
    }

    // Regex to find if a transformation is already present.
    // This looks for common transformation parameters like w_, h_, c_, etc.
    const transformationRegex = /\/upload\/(w_|h_|c_|g_|ar_|q_|f_)/;
    if (url.match(transformationRegex)) {
        return url; // Already transformed, do nothing.
    }

    // Regex to find and replace the version part of the URL, e.g., /upload/v1234567890/
    const versionRegex = /\/upload\/v\d+\//;
    if (url.match(versionRegex)) {
        return url.replace(versionRegex, `/upload/${transformation}/`);
    }

    // If no version and no transformation is found, insert the transformation.
    // This handles URLs like /upload/public_id.jpg
    const parts = url.split('/upload/');
    if (parts.length === 2) {
        return `${parts[0]}/upload/${transformation}/${parts[1]}`;
    }

    // Fallback for any other format.
    return url;
};
