
import { getAuth } from '../firebaseConfig';
import { getSettings } from '../settingsService';

const getApiUrl = () => getSettings().externalApiUrl;

export async function fetchApi<T>(resource: string, endpoint: string = '', options: RequestInit = {}): Promise<T> {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error("External API URL is not configured.");
  
  // Add a cache-busting parameter to GET requests to prevent stale data
  const isGet = options.method === 'GET' || !options.method;
  const cacheBuster = isGet ? `&_=${new Date().getTime()}` : '';

  const url = `${apiUrl}?resource=${resource}${endpoint}${cacheBuster}`;
  
  const auth = getAuth();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (auth && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.error("Error getting Firebase ID token:", error);
    }
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
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `API Error: ${response.statusText}` }));
        const errorMessage = errorData.error || errorData.message || `API Error: ${response.status}`;
        throw new Error(errorMessage);
      }
      const text = await response.text();
      return text ? JSON.parse(text) : ({} as T);
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
