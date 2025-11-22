
import { Prompt } from '../types';

// A small list of common English and Vietnamese words to ignore during similarity calculation.
// This helps focus on more meaningful keywords.
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'in', 'on', 'of', 'for', 'to', 'with', 'and', 'or', 'is', 'are', 'was', 'were', 
    'by', 'it', 'i', 'you', 'he', 'she', 'they', 'we', 'at', 'from', 'as', 'image', 'prompt', 'of',
    'là', 'của', 'và', 'trong', 'một', 'có', 'cho', 'không', 'với', 'để', 'khi', 'tạo', 'hình'
]);

/**
 * Converts a text string into a set of meaningful, lowercased words (tokens).
 * @param text The input string.
 * @returns A Set of unique words from the text.
 */
const tokenize = (text: string): Set<string> => {
    // FIX: Ensure text is treated as a string to prevent crashes on null/undefined values.
    const safeText = String(text || '');
    const words = safeText
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)           // Split by whitespace
        .filter(word => word.length > 2 && !STOP_WORDS.has(word)); // Filter out short words and stop words
    return new Set(words);
};

/**
 * Calculates the Jaccard similarity between two sets of strings.
 * Jaccard similarity = (size of intersection) / (size of union)
 * @param setA The first set of words.
 * @param setB The second set of words.
 * @returns A similarity score between 0 and 1.
 */
const calculateJaccardSimilarity = (setA: Set<string>, setB: Set<string>): number => {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    if (union.size === 0) return 0;
    return intersection.size / union.size;
};

/**
 * Finds the most similar prompts from a list based on text similarity to a source prompt.
 * @param sourcePrompt The prompt to find matches for.
 * @param allPrompts The list of all available prompts to search within.
 * @param topN The number of top results to return.
 * @returns An array of the most similar prompts.
 */
export const findSimilarPrompts = (sourcePrompt: Prompt, allPrompts: Prompt[], topN: number = 8): Prompt[] => {
    const sourceTokens = tokenize(sourcePrompt.text);
    
    return allPrompts
        .filter(p => p.id !== sourcePrompt.id) // Exclude the source prompt itself
        .map(p => {
            const targetTokens = tokenize(p.text);
            const similarity = calculateJaccardSimilarity(sourceTokens, targetTokens);
            return { prompt: p, similarity };
        })
        .filter(item => item.similarity > 0.1) // Use a threshold to avoid completely irrelevant results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topN)
        .map(item => item.prompt);
};
