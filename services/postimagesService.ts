const POSTIMAGES_API_URL = 'https://api.postimages.org/1/upload';
// FIX: Using a public CORS proxy to bypass browser restrictions that cause silent failures.
const PROXIED_URL = `https://cors-proxy.framer.app/${POSTIMAGES_API_URL}`;


interface PostImagesResponse {
    status: 'success' | 'error';
    data?: {
        url: string;
        [key: string]: any;
    };
    message?: string;
    error?: string;
}

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        if (typeof reader.result !== 'string') {
            return reject(new Error('Could not read file as string.'));
        }
        resolve(reader.result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
});

export const uploadToPostImages = async (imageFile: File): Promise<string> => {
    try {
        const base64Image = await toBase64(imageFile);

        const formData = new FormData();
        formData.append('image', base64Image);

        const response = await fetch(PROXIED_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(`PostImages API error: ${errorData.error || response.statusText}`);
        }

        const result: PostImagesResponse = await response.json();

        if (result.status === 'success' && result.data?.url) {
            return result.data.url;
        } else {
            throw new Error(`Failed to upload image to PostImages. Reason: ${result.message || result.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("Error uploading to PostImages:", error);
        
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error("Failed to upload to PostImages: A network error occurred. This is often caused by ad-blockers, network configuration, or CORS policies. Please check your browser's console for more details.");
        }

        if (error instanceof Error) {
            throw new Error(error.message);
        }

        throw new Error("An unknown error occurred during PostImages upload.");
    }
};