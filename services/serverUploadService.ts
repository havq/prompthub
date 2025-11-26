
import { getSettings } from './settingsService';

interface UploadResponse {
    imageUrl: string;
    videoUrl?: string;
    error?: string; // Add error field to handle JSON error responses
}

export const uploadToServer = async (imageFile: File): Promise<UploadResponse> => {
    const apiUrl = getSettings().externalApiUrl;
    if (!apiUrl) {
        throw new Error("External API URL is not configured.");
    }
    
    const uploadUrl = `${apiUrl}?resource=upload`;

    const formData = new FormData();
    formData.append('image', imageFile);
    
    const authToken = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    try {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            headers: headers
            // Do not set Content-Type header when using FormData,
            // the browser will set it with the correct boundary.
        });

        if (!response.ok) {
            // Try to get more specific error info from the response body
            let errorMessage = `Server upload failed with status ${response.status}`;
            try {
                // The server might send a JSON object with an 'error' key
                const errorResult: UploadResponse = await response.json();
                if (errorResult.error) {
                    errorMessage = errorResult.error;
                }
            } catch (e) {
                // If parsing as JSON fails, the response might be plain text or HTML
                const errorText = await response.text();
                if (errorText) {
                    errorMessage = errorText;
                }
            }
            throw new Error(errorMessage);
        }
        
        // A 200 OK response isn't guaranteed to be JSON. Read as text first for safety.
        const responseText = await response.text();
        if (!responseText) {
            throw new Error("Server returned a successful response but the body was empty.");
        }

        try {
            const result: UploadResponse = JSON.parse(responseText);
            if (result.imageUrl || result.videoUrl) {
                return result;
            } else {
                // The JSON was valid but didn't contain a URL or contained an error.
                throw new Error(result.error || 'Server upload failed: URL not found in response.');
            }
        } catch (e) {
            // This catches the 'Unexpected end of JSON input' error and other parsing errors.
            // It provides a much more useful debug message.
            console.error("Failed to parse server response as JSON. Body:", responseText);
            throw new Error(`Failed to parse server response. The server sent: ${responseText.substring(0, 200)}...`);
        }
    } catch (error) {
        console.error("Error uploading to server:", error);
        if (error instanceof Error) {
            // Re-throw the more descriptive error from the try block
            throw error;
        }
        throw new Error("An unknown error occurred during server upload.");
    }
};
