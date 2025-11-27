import { useLanguage } from '../../context/LanguageContext';

export const parseYouTubeUrl = (url: string): { videoId: string | null } => {
    if (!url) {
        return { videoId: null };
    }
    let videoId: string | null = null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    if (match && match[1]) {
        videoId = match[1];
    }
    return { videoId };
};

export const formatCount = (count: number | undefined): string => {
    const num = Number(count || 0);
    if (num < 1000) {
      return num.toLocaleString();
    }
    const units = ['k', 'm', 'b', 't'];
    // toFixed(0).length is a trick to get number of digits
    const unit = Math.floor((num.toFixed(0).length - 1) / 3) - 1;
    
    if (unit >= units.length) {
        return num.toLocaleString();
    }
    
    const value = num / Math.pow(1000, unit + 1);

    // Truncate to one decimal place
    const truncatedValue = Math.floor(value * 10) / 10;
    
    return String(truncatedValue) + units[unit];
};

export const getRotationClass = (rotation?: number, viewMode?: string) => {
    const scaleClass = (viewMode === 'grid' || viewMode === 'compact') ? 'scale-[1.8]' : '';
    if (rotation === 90) return `rotate-90 ${scaleClass}`;
    if (rotation === -90) return `-rotate-90 ${scaleClass}`;
    return '';
};

export const getImageUrls = (imageUrlValue: string | undefined): string[] => {
    if (!imageUrlValue) return [];
    
    // Check if it looks like a JSON array (starts with [ and ends with ])
    const trimmed = imageUrlValue.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                // Filter out non-string items and empty strings
                const validUrls = parsed.filter(url => typeof url === 'string' && url.length > 0);
                if (validUrls.length > 0) {
                    return validUrls;
                }
            }
        } catch (e) {
            // console.warn("Failed to parse imageUrl JSON:", imageUrlValue);
            // If JSON parsing fails, assume it's a malformed string or a single URL
        }
    }
    
    // Handle as a single plain string URL if parsing failed or it wasn't JSON
    return [imageUrlValue];
};