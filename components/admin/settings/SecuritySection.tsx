import React from 'react';
import { AppSettings, RecaptchaSettings } from '../../../types';
import CollapsibleSection from './CollapsibleSection';
import { Toggle } from './SharedComponents';
import Spinner from '../../Spinner';

interface SecuritySectionProps {
    settings: AppSettings;
    onChange: (key: keyof AppSettings, value: any) => void;
    t: (key: string) => string;
    handleRecaptchaChange: (field: keyof RecaptchaSettings, value: any) => void;
    handleChangePassword: (e: React.FormEvent) => Promise<void>;
    oldPassword: string;
    setOldPassword: (val: string) => void;
    newPassword: string;
    setNewPassword: (val: string) => void;
    confirmPassword: string;
    setConfirmPassword: (val: string) => void;
    passwordMessage: { type: string, text: string };
    isActionLoading: boolean;
}

const SecuritySection: React.FC<SecuritySectionProps> = ({
    settings, onChange, t, handleRecaptchaChange,
    handleChangePassword, oldPassword, setOldPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword,
    passwordMessage, isActionLoading
}) => {
    return (
        <>
            <CollapsibleSection title="reCAPTCHA Settings">
                <div className="space-y-6">
                    <Toggle checked={settings.recaptchaSettings?.enabled ?? false} onChange={val => handleRecaptchaChange('enabled', val)} label="Enable Google reCAPTCHA" hint="Protects login and registration forms from bots." />
                    {settings.recaptchaSettings?.enabled && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">reCAPTCHA Version</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2"><input type="radio" value="v2" checked={settings.recaptchaSettings?.version === 'v2'} onChange={e => handleRecaptchaChange('version', e.target.value)} /> Version 2 ("I'm not a robot" checkbox)</label>
                                    <label className="flex items-center gap-2"><input type="radio" value="v3" checked={settings.recaptchaSettings?.version === 'v3'} onChange={e => handleRecaptchaChange('version', e.target.value)} /> Version 3 (Invisible)</label>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg space-y-4">
                                <h4 className="font-semibold">Version 2 Keys</h4>
                                <div>
                                    <label htmlFor="recaptcha-v2-site" className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">v2 Site Key (Public)</label>
                                    <input type="text" id="recaptcha-v2-site" value={settings.recaptchaSettings?.v2SiteKey || ''} onChange={e => handleRecaptchaChange('v2SiteKey', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"/>
                                </div>
                                <div>
                                    <label htmlFor="recaptcha-v2-secret" className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">v2 Secret Key (Private)</label>
                                    <input type="password" id="recaptcha-v2-secret" value={settings.recaptchaSettings?.v2SecretKey || ''} onChange={e => handleRecaptchaChange('v2SecretKey', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"/>
                                </div>
                            </div>
                                <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg space-y-4">
                                <h4 className="font-semibold">Version 3 Keys</h4>
                                <div>
                                    <label htmlFor="recaptcha-v3-site" className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">v3 Site Key (Public)</label>
                                    <input type="text" id="recaptcha-v3-site" value={settings.recaptchaSettings?.v3SiteKey || ''} onChange={e => handleRecaptchaChange('v3SiteKey', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"/>
                                </div>
                                <div>
                                    <label htmlFor="recaptcha-v3-secret" className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">v3 Secret Key (Private)</label>
                                    <input type="password" id="recaptcha-v3-secret" value={settings.recaptchaSettings?.v3SecretKey || ''} onChange={e => handleRecaptchaChange('v3SecretKey', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"/>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </CollapsibleSection>
            
            <CollapsibleSection title={t('admin.password.title')}>
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div><label htmlFor="old-pass" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.password.old')}</label><input type="password" id="old-pass" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600" required /></div>
                    <div><label htmlFor="new-pass" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.password.new')}</label><input type="password" id="new-pass" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600" required /></div>
                    <div><label htmlFor="confirm-pass" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.password.confirm')}</label><input type="password" id="confirm-pass" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600" required /></div>
                    {passwordMessage.text && <p className={`text-sm ${passwordMessage.type === 'error' ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>{passwordMessage.text}</p>}
                    <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors flex justify-center" disabled={isActionLoading}>{isActionLoading ? <Spinner size="sm" /> : t('admin.password.changeButton')}</button>
                </form>
            </CollapsibleSection>
        </>
    );
};

export default SecuritySection;