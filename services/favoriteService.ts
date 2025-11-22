
import { getUserFavorites, setUserFavorite } from './api';
import { AuthUser } from '../types';

const GUEST_FAVORITES_KEY = 'promptGalleryGuestFavorites';

const getLocalFavorites = (): Set<string> => {
  try {
    const data = localStorage.getItem(GUEST_FAVORITES_KEY);
    return data ? new Set(JSON.parse(data)) : new Set();
  } catch (e) {
    console.error("Failed to parse guest favorites from localStorage", e);
    return new Set();
  }
};

const saveLocalFavorites = (favorites: Set<string>) => {
  try {
    localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
  } catch (e) {
    console.error("Failed to save guest favorites to localStorage", e);
  }
};

export const getFavorites = async (user: AuthUser | null): Promise<Set<string>> => {
  if (user) {
    return getUserFavorites(user.uid);
  }
  return Promise.resolve(getLocalFavorites());
};

export const toggleFavorite = async (
  promptId: string, 
  user: AuthUser | null, 
  authorId?: string, 
  existingFavorites?: Set<string>
): Promise<Set<string>> => {
  
  // Step 1: Determine current state. Use passed-in state if available to avoid a fetch.
  let currentFavorites = existingFavorites;
  if (!currentFavorites) {
      currentFavorites = await getFavorites(user);
  }

  const isFavorite = currentFavorites.has(promptId);
  const newIsFavorite = !isFavorite;

  // Step 2: Perform the update action on the backend or local storage.
  if (user) {
    // We rely on the API call succeeding. If it fails, the UI might be out of sync until next refresh,
    // but this prevents the double-fetch issue.
    await setUserFavorite(user.uid, promptId, newIsFavorite, authorId);
  } else {
    // Guest logic: synchronous local storage update
    const localFavs = getLocalFavorites();
    if (isFavorite) {
      localFavs.delete(promptId);
    } else {
      localFavs.add(promptId);
    }
    saveLocalFavorites(localFavs);
    return localFavs;
  }

  // Step 3: Construct the new set locally (Optimistic Update)
  // This avoids the second API call to re-fetch the list.
  const updatedFavorites = new Set(currentFavorites);
  if (newIsFavorite) {
      updatedFavorites.add(promptId);
  } else {
      updatedFavorites.delete(promptId);
  }
  
  return updatedFavorites;
};