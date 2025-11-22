
import { getSettings } from '../settingsService';

const getApiUrl = () => getSettings().externalApiUrl;

export async function fetchApi<T>(resource: string, endpoint: string = '', options: RequestInit = {}, explicitToken?: string): Promise<T> {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error("External API URL is not configured.");
  
  // Add a cache-busting parameter to GET requests to prevent stale data
  const isGet = options.method === 'GET' || !options.method;
  const cacheBuster = isGet ? `&_=${new Date().getTime()}` : '';

  const url = `${apiUrl}?resource=${resource}${endpoint}${cacheBuster}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Retrieve token from LocalStorage instead of Firebase
  const token = explicitToken || localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add timeout using AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  const config: RequestInit = {
    ...options,
    headers: headers,
    signal: controller.signal,
  };

  try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      const text = await response.text();

      if (!response.ok) {
        let errorMessage = `API Error: ${response.status}`;
        try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorData.message || errorMessage;
        } catch(e) {
             // If not JSON, use text (might be HTML error page)
             // Truncate if too long to avoid flooding logs
             errorMessage = `API Error ${response.status}: ${text.substring(0, 200)}`;
        }
        
        // Handle token expiration
        if (response.status === 401 && token) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_profile');
            window.dispatchEvent(new Event('auth-expired')); // Optional: listen for this to redirect
        }
        
        throw new Error(errorMessage);
      }
      
      try {
          return text ? JSON.parse(text) : ({} as T);
      } catch (e) {
          console.error("Failed to parse server response as JSON. Raw text:", text);
          throw new Error(`Invalid JSON response from server. The server returned: ${text.substring(0, 200)}...`);
      }

  } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
          throw new Error('Request timed out. The server is taking too long to respond.');
      }
      throw error;
  }
}

export const mapItem = <T extends {id: any}>(item: T): T => {
    return { ...item, id: String(item.id) };
}

export const mapItems = <T extends {id: any}>(items: T[]): T[] => {
    if (!Array.isArray(items)) return [];
    return items.map(mapItem);
}
