
// services/ratingService.ts
import { 
    saveRating as apiSaveRating, 
    getAverageRating as apiGetAverageRating, 
    getAllAverageRatings as apiGetAllAverageRatings,
    getRatings as apiGetRatings
} from './api';
import { Prompt, UserProfile, AuthUser } from '../utils/types';

/**
 * Retrieves the ratings given by the current logged-in user. Guests will not have ratings.
 * @param user The current Auth user object, or null if guest.
 * @returns A promise that resolves to a record of prompt IDs to the user's rating.
 */
export const getRatings = async (user: AuthUser | null): Promise<Record<string, number>> => {
    // Only fetch ratings for logged-in users.
    if (!user) {
        return {};
    }

    try {
        // Use the user's UID as the unique identifier for ratings.
        // FIX: The `apiGetRatings` function from `api.ts` expects the `AuthUser` object (or id), not just the UID.
        return await apiGetRatings(user);
    } catch (error) {
        console.error("Could not fetch user ratings:", error);
        return {};
    }
};

/**
 * Saves a new rating for a specific prompt from a logged-in user.
 * This function will not execute if the user is not logged in.
 * @param prompt The prompt being rated.
 * @param rating The rating value (1-5). A rating of 0 removes the user's rating.
 * @param userProfile The profile of the current authenticated user. Must not be null.
 */
export const saveRating = async (prompt: Prompt, rating: number, userProfile: UserProfile): Promise<void> => {
    try {
        // The user's UID is the identifier. The UI layer ensures userProfile is not null.
        // FIX: The `apiSaveRating` function from `api.ts` expects 3 arguments, not 4. The `uid` is extracted inside the api function.
        await apiSaveRating(prompt, rating, userProfile);
    } catch (error) {
        console.error("Could not save rating:", error);
    }
};

/**
 * Calculates the average rating and vote count for a specific prompt from the active data source.
 * @param promptId The ID of the prompt.
 * @returns A promise that resolves to an object with the average rating and total count.
 */
export const getAverageRating = async (promptId: string): Promise<{ average: number, count: number }> => {
    try {
        return await apiGetAverageRating(promptId);
    } catch (error) {
        console.error(`Could not get average rating for prompt ${promptId}:`, error);
        return { average: 0, count: 0 };
    }
};

/**
 * Calculates average ratings for all prompts from the active data source.
 * @returns A promise that resolves to a record of prompt IDs to their average rating and count.
 */
export const getAllAverageRatings = async (): Promise<Record<string, { average: number; count: number }>> => {
    try {
        return await apiGetAllAverageRatings();
    } catch (error) {
        console.error("Could not fetch all average ratings:", error);
        return {};
    }
};