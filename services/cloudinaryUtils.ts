
/**
 * Transforms a Cloudinary URL to apply specified transformations for optimization.
 * Automatically injects 'f_auto,q_auto' for best performance/quality ratio.
 * @param url The original Cloudinary image URL.
 * @param transformation The transformation string (e.g., 'w_260,h_360,c_fill').
 * @returns The transformed URL, or the original URL if it's not a valid Cloudinary URL.
 */
export const transformCloudinaryUrl = (url: string, transformation: string): string => {
    if (!url || !url.includes('res.cloudinary.com/')) {
        return url;
    }

    // Ensure auto format and quality are always present for performance
    let optimizedTransformation = transformation;
    if (!optimizedTransformation.includes('f_auto')) {
        optimizedTransformation += ',f_auto';
    }
    if (!optimizedTransformation.includes('q_auto')) {
        optimizedTransformation += ',q_auto';
    }

    // Regex to find if a transformation is already present.
    // This looks for common transformation parameters like w_, h_, c_, etc.
    // We look for the start of the upload path to inject correctly.
    
    // If url already has /upload/v.../ format
    const versionRegex = /\/upload\/v\d+\//;
    if (url.match(versionRegex)) {
        // Check if there are existing transformations before the version
        // This is a simplified check. For full robustness, we assume standard Cloudinary URL structure.
        return url.replace(/\/upload\/(?:[^\/]+\/)?v(\d+)\//, `/upload/${optimizedTransformation}/v$1/`);
    }

    // If URL is /upload/public_id (no version, no transform)
    const parts = url.split('/upload/');
    if (parts.length === 2) {
        // Check if the second part already starts with transformations (heuristic)
        // Assuming public IDs don't typically start with 'w_', 'h_', etc. immediately followed by comma/slash
        // But safer to just inject if we are sure it's untransformed.
        return `${parts[0]}/upload/${optimizedTransformation}/${parts[1]}`;
    }

    return url;
};
