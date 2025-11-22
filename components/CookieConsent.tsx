import React, { useState, useEffect } from 'react';
import { getSettings } from '../services/settingsService';
import { Link } from 'react-router-dom';

const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const settings = getSettings().cookieConsentSettings;

    useEffect(() => {
        try {
            if (settings?.enabled && !localStorage.getItem('cookie_consent')) {
                setIsVisible(true);
            }
        } catch (e) {
            console.error("Could not access localStorage for cookie consent.", e);
        }
    }, [settings?.enabled]);

    const handleAccept = () => {
        try {
            localStorage.setItem('cookie_consent', 'true');
        } catch (e) {
            console.error("Could not write to localStorage for cookie consent.", e);
        }
        setIsVisible(false);
    };

    if (!isVisible || !settings || !settings.enabled) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-gray-900/90 dark:bg-black/90 backdrop-blur-sm text-white p-4 transition-transform duration-500 ease-in-out transform translate-y-0">
            <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-center sm:text-left flex-grow">
                    {settings.message}
                    {settings.privacyPolicyLink && (
                        <Link to={settings.privacyPolicyLink} className="font-semibold underline hover:text-indigo-300 ml-2">
                            Privacy Policy
                        </Link>
                    )}
                </p>
                <button
                    onClick={handleAccept}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition-colors flex-shrink-0"
                >
                    {settings.acceptButtonText}
                </button>
            </div>
        </div>
    );
};

export default CookieConsent;