import React, { useState, useEffect } from 'react';
import { NotificationSettings, NotificationType } from '../../utils/types';
import { useLanguage } from '../../context/LanguageContext';
import Spinner from '../Spinner';

interface UserSettingsProps {
    initialSettings?: NotificationSettings;
    onSave: (settings: Required<NotificationSettings>) => Promise<void>;
    onClose?: () => void;
}

const defaultNotificationSettings: Required<NotificationSettings> = {
    follow: true, favorite: true, collection: true, remix: true, 
    comment: true, showcase: true, badgeUnlocked: true, rating: true,
    promptApproved: true, promptRejected: true
};

const ToggleSwitch: React.FC<{
    id: string; checked: boolean; onChange: (checked: boolean) => void;
    label: string; description: string;
}> = ({ id, checked, onChange, label, description }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <span className="flex-grow flex flex-col"><span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span><span className="text-xs text-gray-500 dark:text-gray-400">{description}</span></span>
        <label htmlFor={id} className="relative inline-flex items-center cursor-pointer"><input type="checkbox" id={id} className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} /><div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div></label>
    </div>
);

const UserSettings: React.FC<UserSettingsProps> = ({ initialSettings, onSave, onClose }) => {
    const { t } = useLanguage();
    const [settings, setSettings] = useState<Required<NotificationSettings>>(defaultNotificationSettings);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
    
    useEffect(() => {
        setSettings({ ...defaultNotificationSettings, ...initialSettings });
    }, [initialSettings]);

    const handleSettingChange = (setting: keyof NotificationSettings, value: boolean) => {
        setSettings(prev => ({ ...prev, [setting]: value }));
        setHasChanges(true);
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await onSave(settings);
            setSaveStatus('saved');
            setTimeout(() => {
                setSaveStatus('idle');
                if (onClose) onClose();
            }, 2000);
            setHasChanges(false);
        } catch (err) { console.error("Failed to save settings", err); } 
        finally { setIsSaving(false); }
    };

    // Loosen the type constraint for `type` to allow for translation key mismatches like 'badgeUnlocked'
    const notificationOptions: { key: keyof NotificationSettings, type: string }[] = [
        { key: 'follow', type: 'follow' }, { key: 'favorite', type: 'favorite' },
        { key: 'comment', type: 'comment' }, { key: 'remix', type: 'remix' },
        { key: 'collection', type: 'collection' }, { key: 'showcase', type: 'showcase' },
        { key: 'rating', type: 'rating' }, { key: 'badgeUnlocked', type: 'badgeUnlocked' },
        { key: 'promptApproved', type: 'promptApproved' },
        { key: 'promptRejected', type: 'promptRejected' },
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg space-y-6">
            <div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('profile.notificationSettings.description')}</p>
            </div>
            <div className="space-y-4">
                {notificationOptions.map(opt => (
                    <ToggleSwitch
                        key={String(opt.key)} id={`toggle-${opt.key}`}
                        checked={settings[opt.key]}
                        onChange={(value) => handleSettingChange(opt.key, value)}
                        label={t(`profile.notificationSettings.${opt.type}.label`)}
                        description={t(`profile.notificationSettings.${opt.type}.description`)}
                    />
                ))}
            </div>
            {hasChanges && (
                <div className="pt-4 flex justify-end">
                    <button onClick={handleSaveSettings} disabled={isSaving} className="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 w-36 flex justify-center">
                        {isSaving ? <Spinner size="sm" /> : saveStatus === 'saved' ? t('profile.notificationSettings.saved') : t('profile.notificationSettings.saveButton')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserSettings;