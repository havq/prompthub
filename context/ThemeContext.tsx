import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { getSettings } from '../services/settingsService';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getInitialTheme = (): Theme => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const storedPrefs = window.localStorage.getItem('theme');
            // 1. User has a preference, use it.
            if (storedPrefs === 'light' || storedPrefs === 'dark') {
                return storedPrefs;
            }
        }
        
        // 2. No user preference, check the app's default setting from settingsService.
        const appDefaultTheme = getSettings().defaultTheme;
        if (appDefaultTheme === 'light' || appDefaultTheme === 'dark') {
            return appDefaultTheme;
        }

        // 3. App default is 'system' or not set, use the browser/OS preference.
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
    } catch (e) {
        console.error("Could not access theme preference.", e);
    }
    // 4. Fallback.
    return 'light'; 
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        const root = window.document.documentElement;
        const isDark = theme === 'dark';

        // Directly apply theme class to the HTML element.
        // This is more robust and avoids potential closure issues.
        root.classList.toggle('dark', isDark);
        
        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            console.error("Failed to save theme to localStorage.", e);
        }
    }, [theme]); // Re-run this effect whenever the theme state changes.

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};