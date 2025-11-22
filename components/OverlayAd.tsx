import React, { useState, useEffect, useRef } from 'react';
import { getSettings } from '../services/settingsService';
import { useLanguage } from '../context/LanguageContext';
import { OverlayAdSettings } from '../types';
import { useAuth } from '../context/AuthContext';

const OverlayAd: React.FC = () => {
    const { t } = useLanguage();
    const { userProfile } = useAuth();
    const [settings, setSettings] = useState<OverlayAdSettings | undefined>(() => getSettings().overlayAdSettings);
    const [isVisible, setIsVisible] = useState(false);
    const adContainerRef = useRef<HTMLDivElement>(null);
    const isProUser = userProfile?.isPro;

    // Effect to listen for settings changes from other tabs/components
    useEffect(() => {
        const handleSettingsChange = () => {
            setSettings(getSettings().overlayAdSettings);
        };
        window.addEventListener('storage', handleSettingsChange);
        return () => window.removeEventListener('storage', handleSettingsChange);
    }, []);

    const checkFrequency = () => {
        if (!settings || !settings.enabled || settings.frequency === 'always') return true;

        const key = 'overlayAdLastShown';
        const now = new Date().getTime();

        try {
            const lastShown = sessionStorage.getItem(key);
            if (settings.frequency === 'session' && lastShown) {
                return false; // Already shown this session
            }

            const dailyLastShown = localStorage.getItem(key);
            if (settings.frequency === 'daily' && dailyLastShown) {
                const oneDay = 24 * 60 * 60 * 1000;
                if (now - parseInt(dailyLastShown, 10) < oneDay) {
                    return false; // Shown within the last 24 hours
                }
            }
        } catch (e) {
            console.error("Could not access storage for ad frequency.", e);
            return true; // Fail open
        }

        return true;
    };

    const markAsShown = () => {
        if (!settings) return;
        const key = 'overlayAdLastShown';
        const now = new Date().getTime().toString();
        try {
            if (settings.frequency === 'session') {
                sessionStorage.setItem(key, now);
            } else if (settings.frequency === 'daily') {
                localStorage.setItem(key, now);
            }
        } catch(e) {
            console.error("Could not write to storage for ad frequency.", e);
        }
    };
    
    useEffect(() => {
        // This effect will now correctly re-run when settings change
        if (isProUser || !settings || !settings.enabled || isVisible || !checkFrequency()) {
            return;
        }

        const showAd = () => {
            // Check isVisible again to prevent race conditions
            if (!isVisible) {
                setIsVisible(true);
                markAsShown();
            }
        };

        let cleanup: () => void = () => {};

        switch (settings.trigger) {
            case 'delay': {
                const timer = setTimeout(showAd, (settings.delaySeconds || 5) * 1000);
                cleanup = () => clearTimeout(timer);
                break;
            }
            case 'scroll': {
                const scrollHandler = () => {
                    const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
                    if (scrollPercent >= (settings.scrollPercentage || 50)) {
                        showAd();
                        window.removeEventListener('scroll', scrollHandler);
                    }
                };
                window.addEventListener('scroll', scrollHandler, { passive: true });
                cleanup = () => window.removeEventListener('scroll', scrollHandler);
                break;
            }
            case 'exit': {
                const exitHandler = (e: MouseEvent) => {
                    if (e.clientY <= 0) {
                        showAd();
                        document.removeEventListener('mouseleave', exitHandler);
                    }
                };
                document.addEventListener('mouseleave', exitHandler);
                cleanup = () => document.removeEventListener('mouseleave', exitHandler);
                break;
            }
        }

        return cleanup;
    }, [settings, isVisible, isProUser]);

    useEffect(() => {
        if (isVisible && adContainerRef.current && settings?.adCode) {
            const container = adContainerRef.current;
            container.innerHTML = ''; 

            const fragment = document.createRange().createContextualFragment(settings.adCode);
            container.appendChild(fragment);

            const scripts = container.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                // FIX: Directly iterate over attributes to ensure correct type inference for 'attr'.
                for (const attr of oldScript.attributes) {
                    newScript.setAttribute(attr.name, attr.value);
                }
                if (oldScript.innerHTML) {
                    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                }
                oldScript.parentNode?.replaceChild(newScript, oldScript);
            });
        }
    }, [isVisible, settings?.adCode]);

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsVisible(false);
    };

    if (isProUser || !isVisible || !settings || !settings.enabled) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4" 
            onClick={handleClose} 
            role="dialog" 
            aria-modal="true"
        >
            <div 
                className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 w-full max-w-2xl" 
                onClick={e => e.stopPropagation()}
            >
                <button 
                    onClick={handleClose}
                    className="absolute -top-3 -right-3 text-white hover:text-gray-300 z-50 p-1.5 bg-gray-800/80 rounded-full"
                    aria-label="Close ad"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <div ref={adContainerRef} className="min-h-[250px] flex items-center justify-center" />
                <span className="block text-xs text-center text-gray-400 dark:text-gray-500 mt-2 tracking-widest uppercase">
                    {t('adCard.advertisement')}
                </span>
            </div>
        </div>
    );
};

export default OverlayAd;