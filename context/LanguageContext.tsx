
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { getSettings } from '../services/settingsService';
import { Language } from '../types';

export type { Language };
type Translations = Record<string, any>;

// FIX: Update tComponent options type to accept a function that returns a ReactNode.
// This allows passing component renderers for rich text formatting.
type ComponentRenderer = (children: string) => React.ReactNode;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, options?: Record<string, string | number>) => string;
  tComponent: (key: string, options?: Record<string, string | number | ComponentRenderer>) => React.ReactNode;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const getInitialLanguage = (): Language => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const storedLang = window.localStorage.getItem('language');
            if (storedLang === 'en' || storedLang === 'vi' || storedLang === 'zh' || storedLang === 'ko') {
                return storedLang as Language;
            }
        }
        
        const defaultLang = getSettings().defaultLanguage || 'vi';

        const browserLang = navigator.language.split(/[-_]/)[0];
        if (browserLang === 'en' || browserLang === 'vi' || browserLang === 'zh' || browserLang === 'ko') {
            return browserLang as Language;
        }

        return defaultLang;

    } catch (e) {
        console.error("Could not access language preference.", e);
        return 'vi';
    }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(getInitialLanguage);
    const [translations, setTranslations] = useState<Translations>({});

    useEffect(() => {
        const fetchTranslations = async () => {
            try {
                // Removed cache buster query param to avoid routing/404 issues on some static hosts
                const response = await fetch(`/locales/${language}.json`);
                if (!response.ok) {
                    throw new Error(`Could not load ${language} translations`);
                }
                const data = await response.json();
                setTranslations(data);
            } catch (error) {
                console.error(error);
                // Fallback to Vietnamese if English fails, for example
                if (language !== 'vi') {
                    setLanguageState('vi');
                }
            }
        };
        fetchTranslations();
    }, [language]);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        try {
            localStorage.setItem('language', lang);
        } catch (e) {
            console.error("Failed to save language to localStorage.", e);
        }
    }, []);

    const t = useCallback((key: string, options?: Record<string, string | number>): string => {
        const keys = key.split('.');
        let result = translations;
        for (const k of keys) {
            if (result && typeof result === 'object' && k in result) {
                result = result[k];
            } else {
                return key; // Return the key if not found
            }
        }

        let resultString = String(result);

        if (options) {
            for (const optionKey in options) {
                resultString = resultString.replace(
                    new RegExp(`{{${optionKey}}}`, 'g'),
                    String(options[optionKey])
                );
            }
        }

        return resultString;
    }, [translations]);
    
    const tComponent = useCallback((key: string, options?: Record<string, string | number | ComponentRenderer>): React.ReactNode => {
        const stringOptions: Record<string, string | number> = {};
        const componentRenderers: Record<string, ComponentRenderer> = {};
    
        if (options) {
            Object.keys(options).forEach(optionKey => {
                const value = options[optionKey];
                if (typeof value === 'string' || typeof value === 'number') {
                    stringOptions[optionKey] = value;
                } else if (typeof value === 'function') {
                    componentRenderers[optionKey] = value;
                }
            });
        }
    
        let translatedString = t(key, stringOptions);
        
        // This regex will split the string by tags like <0>...</0>, but keep the tags in the result array.
        // It finds a tag, captures its content, and the closing tag.
        const parts = translatedString.split(/(<\d+>.*?<\/\d+>)/g).filter(Boolean);
    
        return (
            <>
                {parts.map((part, index) => {
                    // Check if the part is a tagged element, e.g., "<0>Click here</0>"
                    const match = part.match(/<(\d+)>(.*?)<\/(\d+)>/);
                    
                    // We should also check if open and close tags match, e.g. match[1] === match[3]
                    if (match && match[1] === match[3]) {
                        const tagNumber = match[1];
                        const content = match[2];
                        const renderer = componentRenderers[tagNumber];
                        
                        if (renderer) {
                            return <React.Fragment key={index}>{renderer(content)}</React.Fragment>;
                        }
                        // Default behavior if no renderer is provided for the tag number
                        return <span key={index}>{content}</span>;
                    }
                    
                    // If it's not a tag, it's just plain text
                    return <React.Fragment key={index}>{part}</React.Fragment>;
                })}
            </>
        );
    
    }, [t]);

    const value = { language, setLanguage, t, tComponent };
    
    // Render children only when translations are loaded to prevent showing keys initially
    if (Object.keys(translations).length === 0) {
        return null; 
    }

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
