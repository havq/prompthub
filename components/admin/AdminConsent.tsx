import React, { useState } from 'react';
import { getSettings, saveSettings } from '../../services/settingsService';
import { CookieConsentSettings } from '../../types';
import Spinner from '../Spinner';

const AdminConsent: React.FC = () => {
    const [settings, setSettings] = useState<CookieConsentSettings>(() => getSettings().cookieConsentSettings || {
        enabled: false,
        message: 'We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.',
        acceptButtonText: 'Got it!',
        privacyPolicyLink: '/page/privacy-policy'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

    const handleChange = (key: keyof CookieConsentSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveSettings({ cookieConsentSettings: settings });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Failed to save consent settings:", error);
            alert("Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const Toggle: React.FC<{checked: boolean, onChange: (val: boolean) => void, label: string, hint: string}> = ({ checked, onChange, label, hint }) => (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
           <span className="flex-grow flex flex-col">
               <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
               <span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>
           </span>
           <label className="relative inline-flex items-center cursor-pointer">
               <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
               <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
           </label>
       </div>
   );

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Consent Management</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Configure the cookie consent banner that appears for new visitors.
            </p>

            <div className="space-y-6">
                <Toggle
                    checked={settings.enabled}
                    onChange={(val) => handleChange('enabled', val)}
                    label="Enable Cookie Consent Banner"
                    hint="Show a cookie consent banner to first-time visitors."
                />

                <div>
                    <label htmlFor="consent-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Consent Message</label>
                    <textarea
                        id="consent-message"
                        rows={3}
                        value={settings.message}
                        onChange={(e) => handleChange('message', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                    />
                </div>

                <div>
                    <label htmlFor="accept-button-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">"Accept" Button Text</label>
                    <input
                        id="accept-button-text"
                        type="text"
                        value={settings.acceptButtonText}
                        onChange={(e) => handleChange('acceptButtonText', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                    />
                </div>
                
                <div>
                    <label htmlFor="privacy-policy-link" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Privacy Policy Link</label>
                    <input
                        id="privacy-policy-link"
                        type="text"
                        value={settings.privacyPolicyLink}
                        onChange={(e) => handleChange('privacyPolicyLink', e.target.value)}
                        placeholder="/page/privacy-policy"
                        className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Provide a relative path (e.g., /page/privacy) or a full URL.
                    </p>
                </div>

            </div>

            <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-md transition-colors flex justify-center text-base"
                >
                    {isSaving ? <Spinner size="sm" /> : saveStatus === 'saved' ? 'Saved!' : 'Save Consent Settings'}
                </button>
            </div>
        </div>
    );
};

export default AdminConsent;
