// @google/genai-api-fix: Rewriting to Firebase v8 namespaced API to fix module export errors.
// FIX: Use Firebase v9 compat libraries to enable v8 namespaced API. This resolves errors where 'firestore' and 'apps' were not found.
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import { getSettings } from './settingsService';

let auth: firebase.auth.Auth | null = null;
let initialized = false;

const initialize = () => {
    // Only attempt to initialize once per page load.
    // A refresh is required to apply new Firebase settings from the admin panel.
    if (initialized) return;
    initialized = true; // Set flag immediately to prevent re-entry.

    const config = getSettings().firebaseConfig;
    
    // Strengthen the config check to include authDomain, which is essential for Firebase Auth.
    if (config && config.apiKey && config.authDomain) {
        try {
            // Explicitly get the app instance and pass it to auth()
            // This is more robust and helps prevent initialization issues.
            const app = firebase.apps.length === 0 ? firebase.initializeApp(config) : firebase.app();
            auth = firebase.auth(app);
            
            console.log("Firebase Auth initialized successfully.");
        } catch (e) {
            // Improved error logging to guide the user.
            console.error("Firebase Auth initialization failed. Please ensure your firebaseConfig in settings.json is correct and that the services are enabled for your project in the Firebase console.", e);
            auth = null;
        }
    } else {
        // Add a console warning for incomplete configurations to make debugging easier.
        console.warn("Firebase Auth configuration is missing or incomplete. Required fields: apiKey, authDomain. Firebase services will not be initialized.");
    }
};

export const getAuth = (): firebase.auth.Auth | null => {
    initialize();
    return auth;
};

export const googleProvider = new firebase.auth.GoogleAuthProvider();