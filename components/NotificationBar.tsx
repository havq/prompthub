import React, { useState, useEffect } from 'react';
import { getSettings } from '../services/settingsService';
import { NotificationBarSettings } from '../types';
import { Link } from 'react-router-dom';
import { sanitizeHtml } from '../utils/sanitize';

interface NotificationBarProps {
    isVisible: boolean;
    onDismiss: () => void;
}

const NotificationBar: React.FC<NotificationBarProps> = ({ isVisible, onDismiss }) => {
    const [settings, setSettings] = useState<NotificationBarSettings | undefined>(() => getSettings().notificationBarSettings);

    useEffect(() => {
        const handleSettingsChange = () => {
            setSettings(getSettings().notificationBarSettings);
        };
        window.addEventListener('storage', handleSettingsChange);
        return () => window.removeEventListener('storage', handleSettingsChange);
    }, []);

    const handleDismiss = () => {
        onDismiss();
    };

    if (!isVisible || !settings || !settings.enabled) {
        return null;
    }

    const isInternalLink = settings.buttonUrl?.startsWith('/');

    return (
        <div
            className={`fixed left-0 right-0 z-[100] transition-transform duration-300 ease-in-out ${settings.position === 'bottom' ? 'bottom-0' : 'top-0'}`}
            style={{
                backgroundColor: settings.backgroundColor || '#1f2937',
                color: settings.textColor || '#ffffff'
            }}
        >
            <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-4">
                <div className="text-sm text-center flex-grow" dangerouslySetInnerHTML={{ __html: sanitizeHtml(settings.message) }}></div>
                {settings.buttonText && settings.buttonUrl && (
                    isInternalLink ? (
                        <Link
                            to={settings.buttonUrl}
                            className="flex-shrink-0 bg-white/20 hover:bg-white/30 font-bold py-2 px-4 rounded-md transition-colors text-xs"
                        >
                            {settings.buttonText}
                        </Link>
                    ) : (
                        <a
                            href={settings.buttonUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 bg-white/20 hover:bg-white/30 font-bold py-2 px-4 rounded-md transition-colors text-xs"
                        >
                            {settings.buttonText}
                        </a>
                    )
                )}
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
                    aria-label="Dismiss notification"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default NotificationBar;