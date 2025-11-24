import React from 'react';
import { NotificationSettings } from '../../utils/types';
import UserSettings from './UserSettings';
import { useLanguage } from '../../context/LanguageContext';

interface NotificationSettingsModalProps {
    initialSettings?: NotificationSettings;
    onSave: (settings: Required<NotificationSettings>) => Promise<void>;
    onClose: () => void;
}

const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ initialSettings, onSave, onClose }) => {
    const { t } = useLanguage();

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl relative max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('profile.notificationSettings.title')}</h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="overflow-y-auto p-6">
                    <UserSettings initialSettings={initialSettings} onSave={onSave} onClose={onClose} />
                </div>
            </div>
        </div>
    );
};

export default NotificationSettingsModal;
