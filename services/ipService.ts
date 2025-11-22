// services/ipService.ts

let ipHash: string | null = null;

/**
 * Creates a SHA-256 hash of a given string.
 * @param message The string to hash.
 * @returns A promise that resolves to the hex string of the hash.
 */
async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Fetches the user's public IP, hashes it, and caches it for the session.
 * This provides a consistent anonymous identifier for rating.
 * @returns A promise that resolves to the hashed IP string.
 */
export const getHashedIp = async (): Promise<string> => {
    if (ipHash) {
        return ipHash;
    }

    try {
        // The previous attempt using a proxy for ipify.org was still being blocked by some
        // ad-blockers and privacy tools. This switches to a different, less common IP service 
        // that provides a permissive CORS header, removing the need for a proxy and making the request more reliable.
        const response = await fetch('https://api.seeip.org/jsonip');
        if (!response.ok) {
            throw new Error('Failed to fetch IP address from seeip.org');
        }
        const data = await response.json();
        const userIp = data.ip;
        ipHash = await sha256(userIp);
        return ipHash;
    } catch (error) {
        console.error("Could not get user IP, falling back to a random session ID for rating.", error);
        // Fallback for ad-blockers or network issues. This ID is temporary for the session.
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        ipHash = await sha256(sessionId);
        return ipHash;
    }
};
