import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage, Language } from '../context/LanguageContext';
import { getSettings } from '../services/settingsService';

const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [settings, setSettings] = useState(() => getSettings());

    const allLanguages: Record<Language, string> = {
        en: 'English',
        vi: 'Tiếng Việt',
        zh: '中文',
        ko: '한국어',
    };
    
    useEffect(() => {
        const handleSettingsChange = () => {
            setSettings(getSettings());
        };
        window.addEventListener('storage', handleSettingsChange);
        return () => window.removeEventListener('storage', handleSettingsChange);
    }, []);

    const availableLanguages = useMemo(() => {
        const langSettings = settings.languageSettings;
        if (!langSettings) {
            return allLanguages;
        }
        
        const enabledLangs: Partial<Record<Language, string>> = {};
        for (const langCode in allLanguages) {
            if (langSettings[langCode as Language]) {
                enabledLangs[langCode as Language] = allLanguages[langCode as Language];
            }
        }
        return enabledLangs;
    }, [settings.languageSettings]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageChange = (lang: Language) => {
        setLanguage(lang);
        setIsOpen(false);
    };

    if (Object.keys(availableLanguages).length <= 1) {
        return null;
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-indigo-500"
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label="Change language"
            >
                {/* SVG icon from image */}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>
                <span className="font-semibold text-sm">{language.toUpperCase()}</span>

                {/* Dropdown arrow */}
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                    {Object.entries(availableLanguages).map(([code, name]) => (
                        <button
                            key={code}
                            onClick={() => handleLanguageChange(code as Language)}
                            className={`w-full text-left block px-4 py-2 text-sm ${
                                language === code
                                    ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;