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
    const unit = Math.floor((num.toFixed(0).length - 1) / 3) - 1;
    
    if (unit >= units.length) {
        return num.toLocaleString();
    }
    
    const value = num / Math.pow(1000, unit + 1);
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
    if (imageUrlValue.startsWith('[') && imageUrlValue.endsWith(']')) {
        try {
            const parsed = JSON.parse(imageUrlValue);
            if (Array.isArray(parsed)) {
                return parsed.filter(url => typeof url === 'string' && url.length > 0);
            }
        } catch (e) {
            // Not a valid JSON array
        }
    }
    return [imageUrlValue];
};