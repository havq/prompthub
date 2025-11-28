
import React, { useState } from 'react';
import { AppSettings, UploadMethod, WatermarkSettings, SmtpConfig, CloudflareR2Config } from '../../../utils/types';
import CollapsibleSection from './CollapsibleSection';
import { Toggle } from './SharedComponents';
import Spinner from '../../Spinner';
import { authorizeBlogger } from '../../../services/bloggerService';

interface IntegrationSectionProps {
    settings: AppSettings;
    onChange: (key: keyof AppSettings, value: any) => void;
    t: (key: string) => string;
    tComponent: (key: string, options?: any) => React.ReactNode;
    handleWatermarkSettingChange: (field: keyof WatermarkSettings, value: any) => void;
    handleWatermarkApplyToChange: (method: UploadMethod, checked: boolean) => void;
    isUploadingLogo: string | null;
    handleLogoChange: (e: React.ChangeEvent<HTMLInputElement>, type: 'watermark') => void;
    handleRepeaterChange: (key: string, index: number, field: string, value: any) => void;
    handleRemoveRepeaterItem: (key: string, id: string) => void;
    handleAddRepeaterItem: (key: string) => void;
}

const uploadOptions: { value: UploadMethod; label: string }[] = [
    { value: 'server', label: 'Server' },
    { value: 'imgbb', label: 'ImgBB' },
    { value: 'cloudinary', label: 'Cloudinary' },
    { value: 'r2', label: 'Cloudflare R2' },
    { value: 'tumblr', label: 'Tumblr' },
    { value: 'blogger', label: 'Google Drive' },
    { value: 'imgbox', label: 'Imgbox' },
    { value: 'base64', label: 'Base64' }
];

const UploadMethodSelector: React.FC<{
    label: string;
    hint: string;
    selectedMethods: UploadMethod[];
    onChange: (newMethods: UploadMethod[]) => void;
  }> = ({ label, hint, selectedMethods, onChange }) => {
    const handleCheckboxChange = (method: UploadMethod, checked: boolean) => {
        const newMethods = checked 
            ? [...(selectedMethods || []), method]
            : (selectedMethods || []).filter(m => m !== method);
        onChange(newMethods);
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
            <div className="mt-2 space-y-2 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600">
                {uploadOptions.map(option => (
                    <div key={option.value} className="flex items-center">
                        <input 
                            id={`upload-${label.replace(/\s/g, '-')}-${option.value}`} 
                            type="checkbox" 
                            checked={(selectedMethods || []).includes(option.value)}
                            onChange={(e) => handleCheckboxChange(option.value, e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-500 bg-gray-200 dark:bg-gray-600 rounded"
                        />
                        <label htmlFor={`upload-${label.replace(/\s/g, '-')}-${option.value}`} className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">{option.label}</label>
                    </div>
                ))}
            </div>
        </div>
    );
};

const IntegrationSection: React.FC<IntegrationSectionProps> = ({ 
    settings, onChange, t, tComponent,
    handleWatermarkSettingChange, handleWatermarkApplyToChange, isUploadingLogo, handleLogoChange,
    handleRepeaterChange, handleRemoveRepeaterItem, handleAddRepeaterItem
}) => {
    const [isAuthorizingBlogger, setIsAuthorizingBlogger] = useState(false);

    const handleSmtpChange = (field: keyof SmtpConfig, value: any) => {
        const newConfig = { ...settings.smtpConfig, [field]: value } as SmtpConfig;
        onChange('smtpConfig', newConfig);
    };

    const handleConnectBlogger = async () => {
        if (!settings.googleClientId || !settings.googleClientSecret) {
            alert("Please save Google Client ID and Client Secret first.");
            return;
        }
        
        setIsAuthorizingBlogger(true);
        try {
            await authorizeBlogger();
            alert("Google Drive authorized successfully!");
        } catch (error: any) {
            alert("Authorization failed: " + error.message);
        } finally {
            setIsAuthorizingBlogger(false);
        }
    };

    return (
        <>
            <CollapsibleSection title="SMTP Configuration">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Configure your email server to send automated emails (e.g., password resets).</p>
                <div className="space-y-4">
                    <Toggle 
                        checked={settings.smtpConfig?.enabled ?? false} 
                        onChange={val => handleSmtpChange('enabled', val)} 
                        label="Enable SMTP Email" 
                        hint="Turn off to disable email sending features."
                    />
                    
                    {settings.smtpConfig?.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SMTP Host</label>
                                <input type="text" value={settings.smtpConfig?.host || ''} onChange={e => handleSmtpChange('host', e.target.value)} className="mt-1 w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm border border-gray-300 dark:border-gray-500" placeholder="smtp.gmail.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SMTP Port</label>
                                <input type="number" value={settings.smtpConfig?.port || 587} onChange={e => handleSmtpChange('port', parseInt(e.target.value))} className="mt-1 w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm border border-gray-300 dark:border-gray-500" placeholder="587" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                                <input type="text" value={settings.smtpConfig?.username || ''} onChange={e => handleSmtpChange('username', e.target.value)} className="mt-1 w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm border border-gray-300 dark:border-gray-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                                <input type="password" value={settings.smtpConfig?.password || ''} onChange={e => handleSmtpChange('password', e.target.value)} className="mt-1 w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm border border-gray-300 dark:border-gray-500" placeholder="App Password (if 2FA on)" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Encryption</label>
                                <select value={settings.smtpConfig?.encryption || 'tls'} onChange={e => handleSmtpChange('encryption', e.target.value)} className="mt-1 w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm border border-gray-300 dark:border-gray-500">
                                    <option value="tls">TLS</option>
                                    <option value="ssl">SSL</option>
                                    <option value="none">None</option>
                                </select>
                            </div>
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">From Email</label>
                                    <input type="email" value={settings.smtpConfig?.fromEmail || ''} onChange={e => handleSmtpChange('fromEmail', e.target.value)} className="mt-1 w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm border border-gray-300 dark:border-gray-500" placeholder="no-reply@domain.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">From Name</label>
                                    <input type="text" value={settings.smtpConfig?.fromName || ''} onChange={e => handleSmtpChange('fromName', e.target.value)} className="mt-1 w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm border border-gray-300 dark:border-gray-500" placeholder="Prompthub" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Authentication & Google Services">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="google-client-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Google Client ID</label>
                        <input 
                            type="text" 
                            id="google-client-id" 
                            value={settings.googleClientId || ''} 
                            onChange={e => onChange('googleClientId', e.target.value)} 
                            className="mt-1 w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"
                            placeholder="e.g. 123456789-abc...apps.googleusercontent.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="google-client-secret" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Google Client Secret</label>
                        <input 
                            type="password" 
                            id="google-client-secret" 
                            value={settings.googleClientSecret || ''} 
                            onChange={e => onChange('googleClientSecret', e.target.value)} 
                            className="mt-1 w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"
                            placeholder="Required for Google Drive upload (token exchange)"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Required for "Continue with Google" and Google Drive image uploads. Get this from the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">Google Cloud Console</a>.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                        <h4 className="text-sm font-medium text-gray-800 dark:text-white mb-2">Google Drive Authorization</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            Authorize the application to upload images to Google Drive on your behalf. This is required if you select "Google Drive" as an upload method. You must save the Client ID and Secret above first.
                        </p>
                        <button 
                            onClick={handleConnectBlogger} 
                            disabled={isAuthorizingBlogger}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                        >
                            {isAuthorizingBlogger ? <Spinner size="sm" className="mr-2" /> : null}
                            Authorize Google Drive
                        </button>
                    </div>
                </div>
            </CollapsibleSection>
            {/* ... Rest of the file ... */}
            <CollapsibleSection title="Image & Video Uploads">
                    <div className="space-y-6">
                    <UploadMethodSelector label={t('admin.settings.imageUploadMethodAdmin')} hint={t('admin.settings.imageUploadMethodHint')} selectedMethods={settings.imageUploadMethod || []} onChange={newMethods => onChange('imageUploadMethod', newMethods)} />
                    <UploadMethodSelector label={t('admin.settings.imageUploadMethodUser')} hint="" selectedMethods={settings.userImageUploadMethod || []} onChange={newMethods => onChange('userImageUploadMethod', newMethods)} />
                    <UploadMethodSelector label="Image Upload Method (Pro User)" hint="" selectedMethods={settings.proImageUploadMethod || []} onChange={newMethods => onChange('proImageUploadMethod', newMethods)} />
                    
                    <UploadMethodSelector label="Video Upload Method (Admin)" hint="Choose services for admins to upload videos." selectedMethods={settings.videoUploadMethod || []} onChange={newMethods => onChange('videoUploadMethod', newMethods)} />
                    <UploadMethodSelector label="Video Upload Method (User)" hint="Choose services for regular users to upload videos. Leave empty to disable." selectedMethods={settings.userVideoUploadMethod || []} onChange={newMethods => onChange('userVideoUploadMethod', newMethods)} />
                    <UploadMethodSelector label="Video Upload Method (Pro User)" hint="Choose services for Pro users to upload videos. Falls back to user settings if empty." selectedMethods={settings.proVideoUploadMethod || []} onChange={newMethods => onChange('proVideoUploadMethod', newMethods)} />
                </div>
            </CollapsibleSection>
            {/* ... Watermark and API Configs ... */}
            <CollapsibleSection title="Watermark Settings">
                 <div className="space-y-6">
                    <Toggle checked={settings.watermarkSettings?.enabled ?? false} onChange={val => handleWatermarkSettingChange('enabled', val)} label="Enable Watermark" hint="Automatically add a watermark to uploaded images." />
                    {settings.watermarkSettings?.enabled && (
                        <>
                            <Toggle checked={settings.watermarkSettings?.repeat ?? false} onChange={val => handleWatermarkSettingChange('repeat', val)} label="Repeat Watermark" hint="Tile the watermark across the entire image in a pattern." />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Apply to Services</label>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    {(['cloudinary', 'tumblr', 'imgbb', 'server', 'r2', 'blogger', 'imgbox'] as UploadMethod[]).map(method => (
                                        <label key={method} className="flex items-center gap-2">
                                            <input type="checkbox" checked={settings.watermarkSettings?.applyTo?.includes(method)} onChange={e => handleWatermarkApplyToChange(method, e.target.checked)} className="h-4 w-4 rounded" />
                                            <span className="text-sm capitalize">{method === 'blogger' ? 'Google Drive' : method}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            {/* ... rest of watermark settings */}
                             <div>
                                <label htmlFor="watermark-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Watermark Text</label>
                                <input type="text" id="watermark-text" value={settings.watermarkSettings?.text || ''} onChange={e => handleWatermarkSettingChange('text', e.target.value)} className="mt-1 w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2" placeholder="e.g., yoursite.com"/>
                            </div>
                            <div>
                                <label htmlFor="watermark-logo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Watermark Logo URL</label>
                                <div className="flex gap-2 mt-1">
                                    <input type="text" id="watermark-logo" value={settings.watermarkSettings?.logoUrl || ''} onChange={e => handleWatermarkSettingChange('logoUrl', e.target.value)} className="flex-grow bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2" placeholder="https://.../logo.png"/>
                                    <label className="cursor-pointer bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md flex items-center w-28 justify-center">{isUploadingLogo === 'watermark' ? <Spinner size="sm" /> : 'Upload'}<input type="file" accept="image/png, image/jpeg" onChange={e => handleLogoChange(e, 'watermark')} className="hidden" /></label>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Logo URL will be used instead of text if provided.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="watermark-position" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
                                    <select id="watermark-position" value={settings.watermarkSettings?.position || 'bottom-right'} onChange={e => handleWatermarkSettingChange('position', e.target.value)} className="mt-1 w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed" disabled={settings.watermarkSettings?.repeat}>
                                        <option value="bottom-right">Bottom Right</option>
                                        <option value="bottom-left">Bottom Left</option>
                                        <option value="top-right">Top Right</option>
                                        <option value="top-left">Top Left</option>
                                        <option value="center">Center</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="watermark-opacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Opacity ({settings.watermarkSettings?.opacity}%)</label>
                                    <input type="range" id="watermark-opacity" min="0" max="100" value={settings.watermarkSettings?.opacity || 70} onChange={e => handleWatermarkSettingChange('opacity', Number(e.target.value))} className="w-full mt-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="watermark-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Size ({settings.watermarkSettings?.size}% of image width)</label>
                                <input type="range" id="watermark-size" min="1" max="100" value={settings.watermarkSettings?.size || 15} onChange={e => handleWatermarkSettingChange('size', Number(e.target.value))} className="w-full mt-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600" />
                            </div>
                        </>
                    )}
                </div>
            </CollapsibleSection>

             <CollapsibleSection title="API Configurations">
                <div className="space-y-6">
                    {/* IMGBB REPEATER */}
                    <div>
                        <h4 className="font-semibold text-gray-800 dark:text-white">ImgBB API Keys</h4>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('admin.settings.imgbbApiKeyHint')}</p>
                        <div className="space-y-2 mt-3">
                            {(settings.imgbbApiKeys || []).map((item, index) => (
                                <div key={item.id} className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md space-y-2 border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center gap-2">
                                        <input type="text" placeholder="API Key" value={item.key || ''} onChange={e => handleRepeaterChange('imgbbApiKeys', index, 'key', e.target.value)} className="flex-grow bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"/>
                                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.enabled} onChange={e => handleRepeaterChange('imgbbApiKeys', index, 'enabled', e.target.checked)} className="h-4 w-4 rounded" /> Enabled</label>
                                        <button type="button" onClick={() => handleRemoveRepeaterItem('imgbbApiKeys', item.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAddRepeaterItem('imgbbApiKeys')} className="w-full text-center py-2 border-2 border-dashed rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium text-gray-600 dark:text-gray-400">+ Add ImgBB Key</button>
                        </div>
                    </div>
                    {/* CLOUDINARY REPEATER */}
                    <div>
                        <h4 className="font-semibold text-gray-800 dark:text-white">Cloudinary Configurations</h4>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{tComponent('admin.settings.cloudinaryUploadPresetsHint', { '1': (text: string) => <a href="https://cloudinary.com/documentation/upload_presets#unsigned_upload_presets" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{text}</a> })}</p>
                        <div className="space-y-2 mt-3">
                            {(settings.cloudinaryConfigs || []).map((item, index) => (
                                <div key={item.id} className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md space-y-2 border border-gray-200 dark:border-gray-600">
                                    <input type="text" placeholder="Cloud Name" value={item.cloudName || ''} onChange={e => handleRepeaterChange('cloudinaryConfigs', index, 'cloudName', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm" />
                                    <input type="text" placeholder="Upload Preset" value={item.uploadPreset || ''} onChange={e => handleRepeaterChange('cloudinaryConfigs', index, 'uploadPreset', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm" />
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.enabled} onChange={e => handleRepeaterChange('cloudinaryConfigs', index, 'enabled', e.target.checked)} className="h-4 w-4 rounded" /> Enabled</label>
                                        <button type="button" onClick={() => handleRemoveRepeaterItem('cloudinaryConfigs', item.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAddRepeaterItem('cloudinaryConfigs')} className="w-full text-center py-2 border-2 border-dashed rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium text-gray-600 dark:text-gray-400">+ Add Cloudinary Config</button>
                        </div>
                    </div>
                    {/* R2 REPEATER */}
                    <div>
                        <h4 className="font-semibold text-gray-800 dark:text-white">Cloudflare R2 Configurations</h4>
                        <div className="space-y-2 mt-3">
                            {(settings.r2Configs || []).map((item, index) => (
                                <div key={item.id} className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md space-y-2 border border-gray-200 dark:border-gray-600">
                                    <input type="text" placeholder="Account ID" value={item.accountId || ''} onChange={e => handleRepeaterChange('r2Configs', index, 'accountId', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm" />
                                    <input type="text" placeholder="Access Key ID" value={item.accessKeyId || ''} onChange={e => handleRepeaterChange('r2Configs', index, 'accessKeyId', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm" />
                                    <input type="text" placeholder="Secret Access Key" value={item.secretAccessKey || ''} onChange={e => handleRepeaterChange('r2Configs', index, 'secretAccessKey', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm" />
                                    <input type="text" placeholder="Bucket Name" value={item.bucketName || ''} onChange={e => handleRepeaterChange('r2Configs', index, 'bucketName', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm" />
                                    <input type="url" placeholder="Public URL (e.g., https://pub-....r2.dev)" value={item.publicUrl || ''} onChange={e => handleRepeaterChange('r2Configs', index, 'publicUrl', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm" />
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.enabled} onChange={e => handleRepeaterChange('r2Configs', index, 'enabled', e.target.checked)} className="h-4 w-4 rounded" /> Enabled</label>
                                        <button type="button" onClick={() => handleRemoveRepeaterItem('r2Configs', item.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAddRepeaterItem('r2Configs')} className="w-full text-center py-2 border-2 border-dashed rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium text-gray-600 dark:text-gray-400">+ Add R2 Configuration</button>
                        </div>
                    </div>
                    {/* TUMBLR REPEATER */}
                    <div>
                        <h4 className="font-semibold text-gray-800 dark:text-white">Tumblr API Credentials</h4>
                         <div className="space-y-2 mt-3">
                            {(settings.tumblrConfigs || []).map((item, index) => (
                                <div key={item.id} className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md space-y-2 border border-gray-200 dark:border-gray-600">
                                    <input type="text" placeholder="Consumer Key" value={item.consumerKey || ''} onChange={e => handleRepeaterChange('tumblrConfigs', index, 'consumerKey', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"/>
                                    <input type="text" placeholder="Consumer Secret" value={item.consumerSecret || ''} onChange={e => handleRepeaterChange('tumblrConfigs', index, 'consumerSecret', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"/>
                                    <input type="text" placeholder="Token" value={item.token || ''} onChange={e => handleRepeaterChange('tumblrConfigs', index, 'token', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"/>
                                    <input type="text" placeholder="Token Secret" value={item.tokenSecret || ''} onChange={e => handleRepeaterChange('tumblrConfigs', index, 'tokenSecret', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"/>
                                    <input type="text" placeholder="Blog Identifier (e.g., yourblog.tumblr.com)" value={item.blogIdentifier || ''} onChange={e => handleRepeaterChange('tumblrConfigs', index, 'blogIdentifier', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"/>
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.enabled} onChange={e => handleRepeaterChange('tumblrConfigs', index, 'enabled', e.target.checked)} className="h-4 w-4 rounded" /> Enabled</label>
                                        <button type="button" onClick={() => handleRemoveRepeaterItem('tumblrConfigs', item.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAddRepeaterItem('tumblrConfigs')} className="w-full text-center py-2 border-2 border-dashed rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium text-gray-600 dark:text-gray-400">+ Add Tumblr Credentials</button>
                        </div>
                    </div>
                </div>
            </CollapsibleSection>
        </>
    );
};

export default IntegrationSection;
