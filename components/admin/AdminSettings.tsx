

import React, { useState, useRef, useEffect } from 'react';
import { Badge, SocialLink, SocialPlatform, ImgbbKey, CloudinaryConfig, TumblrConfig, SepayConfig, PaypalConfig, LanguageSettings, RecaptchaSettings, NotificationBarSettings, WatermarkSettings, PromptCardSettings, UploadMethod, GamificationSettings } from '../../utils/types';
import { getSettings, saveSettings } from '../../services/settingsService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, Language } from '../../context/LanguageContext';
import { uploadImage } from '../../services/imageUploadService';
import Spinner from '../Spinner';

import GeneralSection from './settings/GeneralSection';
import DesignSection from './settings/DesignSection';
import ContentSection from './settings/ContentSection';
import IntegrationSection from './settings/IntegrationSection';
import SecuritySection from './settings/SecuritySection';
import GamificationSection from './settings/GamificationSection';

const allBadges: Badge[] = [
  'first-contribution', 'prolific-creator', 'master-creator',
  'remix-artist', 'remix-master', 'top-rated', 'community-favorite', 'curator'
];
const socialPlatformOptions: string[] = [ // Changed type to string[] to match component prop type, though it contains SocialPlatform values
    'facebook', 'twitter', 'instagram', 'youtube', 'github', 'linkedin', 'runninghub', 'other'
];

const validateImageFile = (file: File, t: (key: string, options?: any) => string): { isValid: boolean; error?: string } => {
    const MAX_SIZE_MB = getSettings().imageUploadMaxSizeMb || 10;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!ALLOWED_TYPES.includes(file.type)) {
        return {
            isValid: false,
            error: t('modals.showcase.errorInvalidFileType')
        };
    }

    if (file.size > MAX_SIZE_BYTES) {
        return {
            isValid: false,
            error: t('modals.showcase.errorFileSize', { size: MAX_SIZE_MB })
        };
    }

    return { isValid: true };
};

const AdminSettings: React.FC = () => {
    const { changePassword } = useAuth();
    const { t, tComponent } = useLanguage();

    const [localSettings, setLocalSettings] = useState(() => getSettings());
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
    const [isUploadingLogo, setIsUploadingLogo] = useState<'light' | 'dark' | 'watermark' | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Password Change State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

    // Badge Upload State
    const badgeIconUploadRef = useRef<HTMLInputElement>(null);
    const [uploadingBadge, setUploadingBadge] = useState<Badge | null>(null);
    const [isUploadingBadgeIcon, setIsUploadingBadgeIcon] = useState(false);

    useEffect(() => {
        const handleStorageChange = () => {
            setLocalSettings(getSettings());
        };
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const handleSettingsChange = <K extends keyof typeof localSettings>(key: K, value: (typeof localSettings)[K]) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleWatermarkSettingChange = (field: keyof WatermarkSettings, value: any) => {
        handleSettingsChange('watermarkSettings', {
            ...(localSettings.watermarkSettings || {
                enabled: false, applyTo: [], position: 'bottom-right', opacity: 70, size: 15, repeat: false
            }),
            [field]: value
        });
    };

    const handleWatermarkApplyToChange = (method: UploadMethod, checked: boolean) => {
        const currentApplyTo = localSettings.watermarkSettings?.applyTo || [];
        const newApplyTo = checked 
            ? [...currentApplyTo, method]
            : currentApplyTo.filter(m => m !== method);
        handleWatermarkSettingChange('applyTo', newApplyTo);
    };

    const handleNotificationBarChange = (field: keyof NotificationBarSettings, value: any) => {
        handleSettingsChange('notificationBarSettings', {
            ...(localSettings.notificationBarSettings || {
                enabled: false, message: '', position: 'top'
            }),
            [field]: value
        });
    };

    const handleRecaptchaChange = (field: keyof RecaptchaSettings, value: any) => {
        handleSettingsChange('recaptchaSettings', {
            ...(localSettings.recaptchaSettings || {
                enabled: false, version: 'v2', v2SiteKey: '', v2SecretKey: '', v3SiteKey: '', v3SecretKey: ''
            }),
            [field]: value
        });
    };

    const handleLanguageSettingChange = (lang: keyof LanguageSettings, value: boolean) => {
        setLocalSettings(prev => ({
            ...prev,
            languageSettings: {
                ...(prev.languageSettings || { en: true, vi: true, zh: true, ko: true }),
                [lang]: value
            }
        }));
    };

    const handlePromptCardSettingChange = <K extends keyof PromptCardSettings>(key: K, value: boolean) => {
        const defaultPromptCardSettings: PromptCardSettings = {
            showViewCount: true,
            showShowcaseCount: true,
            showCommentCount: true,
            showRemixCount: true,
            showRatings: true,
            showCopyButton: true,
            showRemixButton: true,
        };
        
        setLocalSettings(prev => ({
            ...prev,
            promptCardSettings: {
                ...(prev.promptCardSettings || defaultPromptCardSettings),
                [key]: value
            }
        }));
    };
    
    const handleRepeaterChange = <T extends ImgbbKey | CloudinaryConfig | TumblrConfig | SepayConfig | PaypalConfig>(
        key: 'imgbbApiKeys' | 'cloudinaryConfigs' | 'tumblrConfigs', 
        index: number, 
        field: string, 
        value: any
    ) => {
        const newItems = [...(localSettings[key] as T[] || [])];
        if (newItems[index]) {
            (newItems[index] as any)[field] = value;
            handleSettingsChange(key, newItems as any);
        }
    };
    
    const handleAddRepeaterItem = (key: 'imgbbApiKeys' | 'cloudinaryConfigs' | 'tumblrConfigs') => {
        const newItem: any = { id: `new-${Date.now()}`, enabled: true };
        if (key === 'imgbbApiKeys') newItem.key = '';
        if (key === 'cloudinaryConfigs') { newItem.cloudName = ''; newItem.uploadPreset = ''; }
        if (key === 'tumblrConfigs') { newItem.consumerKey = ''; newItem.consumerSecret = ''; newItem.token = ''; newItem.tokenSecret = ''; newItem.blogIdentifier = ''; }
        
        handleSettingsChange(key, [...(localSettings[key] as any[] || []), newItem] as any);
    };

    const handleRemoveRepeaterItem = (key: 'imgbbApiKeys' | 'cloudinaryConfigs' | 'tumblrConfigs', id: string) => {
        handleSettingsChange(key, (localSettings[key] as any[] || []).filter(item => item.id !== id) as any);
    };

    const handleApplyGeneralSettings = async () => {
        setIsActionLoading(true);
        try {
            const { sepayConfig, paypalConfig, ...otherSettings } = localSettings;
            await saveSettings(otherSettings);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Failed to save settings:", error);
            alert(`Failed to save settings:\n${error}`);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'light' | 'dark' | 'watermark') => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const validation = validateImageFile(file, t);
        if (!validation.isValid) {
            alert(validation.error || 'Invalid file.');
            if (e.target) e.target.value = "";
            return;
        }

        setIsUploadingLogo(type);
        try {
            const result = await uploadImage(file, undefined, { isAdmin: true });
            if (type === 'light') {
                handleSettingsChange('appLogoLight', result.imageUrl);
            } else if (type === 'dark') {
                handleSettingsChange('appLogoDark', result.imageUrl);
            } else if (type === 'watermark') {
                handleWatermarkSettingChange('logoUrl', result.imageUrl);
            }
        } catch (error: any) { alert(`Logo upload failed: ${error.message}`); } 
        finally {
            setIsUploadingLogo(null);
            if (e.target) e.target.value = "";
        }
    };
    
    const handleBadgeIconUploadClick = (badge: Badge) => {
        setUploadingBadge(badge);
        badgeIconUploadRef.current?.click();
    };
    
    const handleRemoveBadgeIcon = (badge: Badge) => {
        const newCustomIcons = { ...localSettings.customBadgeIcons };
        delete newCustomIcons[badge];
        handleSettingsChange('customBadgeIcons', newCustomIcons);
    };

    const handleBadgeIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!uploadingBadge) return;
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = validateImageFile(file, t);
        if (!validation.isValid) {
            alert(validation.error || 'Invalid file.');
            if (badgeIconUploadRef.current) badgeIconUploadRef.current.value = "";
            return;
        }

        setIsUploadingBadgeIcon(true);
        try {
            const { imageUrl: url } = await uploadImage(file, undefined, { isAdmin: true });
            handleSettingsChange('customBadgeIcons', { ...localSettings.customBadgeIcons, [uploadingBadge]: url });
        } catch (err: any) { alert(err.message || "Failed to upload icon."); }
        finally {
            setIsUploadingBadgeIcon(false);
            setUploadingBadge(null);
            if (badgeIconUploadRef.current) badgeIconUploadRef.current.value = "";
        }
    };

    const handleAddFooterSocialLink = () => {
        const currentLinks = Array.isArray(localSettings.footerSocialLinks) ? localSettings.footerSocialLinks : [];
        handleSettingsChange('footerSocialLinks', [...currentLinks, { platform: 'other', url: '', target: '_blank' }]);
    };
    
    const handleFooterSocialLinkChange = (index: number, field: keyof SocialLink, value: string) => {
        const newLinks = [...(localSettings.footerSocialLinks || [])];
        if (newLinks[index]) {
            (newLinks[index] as any)[field] = value;
            handleSettingsChange('footerSocialLinks', newLinks);
        }
    };
    
    const handleRemoveFooterSocialLink = (index: number) => {
        handleSettingsChange('footerSocialLinks', (localSettings.footerSocialLinks || []).filter((_, i) => i !== index));
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage({ type: '', text: '' });
        if (newPassword !== confirmPassword) { setPasswordMessage({ type: 'error', text: t('admin.password.errorMismatch') }); return; }
        if (newPassword.length < 6) { setPasswordMessage({ type: 'error', text: t('admin.password.errorLength') }); return; }
        
        setIsActionLoading(true);
        try {
            const success = await changePassword(oldPassword, newPassword);
            if (success) {
                setPasswordMessage({ type: 'success', text: t('admin.password.success') });
                setOldPassword(''); setNewPassword(''); setConfirmPassword('');
                setTimeout(() => setPasswordMessage({ type: '', text: '' }), 3000);
            } else { setPasswordMessage({ type: 'error', text: t('admin.password.errorIncorrect') }); }
        } catch(error) { setPasswordMessage({ type: 'error', text: t('admin.password.errorGeneric') }); }
        finally { setIsActionLoading(false); }
    };

    const handleGamificationSettingChange = (field: keyof GamificationSettings, value: number) => {
        handleSettingsChange('gamificationSettings', {
            ...(localSettings.gamificationSettings || {
                promptFavorited: 1, promptCollected: 2, promptRemixed: 5, rating5Star: 2, commentReceived: 1
            }),
            [field]: value
        });
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-8">
                    <GeneralSection settings={localSettings} onChange={handleSettingsChange} t={t} />
                    <DesignSection
                        settings={localSettings}
                        onChange={handleSettingsChange}
                        t={t}
                        isUploadingLogo={isUploadingLogo}
                        handleLogoChange={handleLogoChange as any}
                        allBadges={allBadges}
                        handleBadgeIconUploadClick={handleBadgeIconUploadClick}
                        handleRemoveBadgeIcon={handleRemoveBadgeIcon}
                        isUploadingBadgeIcon={isUploadingBadgeIcon}
                        uploadingBadge={uploadingBadge}
                        badgeIconUploadRef={badgeIconUploadRef}
                        handleBadgeIconFileChange={handleBadgeIconFileChange}
                        handleAddFooterSocialLink={handleAddFooterSocialLink}
                        handleFooterSocialLinkChange={handleFooterSocialLinkChange}
                        handleRemoveFooterSocialLink={handleRemoveFooterSocialLink}
                        socialPlatformOptions={socialPlatformOptions}
                        handleNotificationBarChange={handleNotificationBarChange}
                        handleLanguageSettingChange={handleLanguageSettingChange}
                    />
                    <SecuritySection
                        settings={localSettings}
                        onChange={handleSettingsChange}
                        t={t}
                        handleRecaptchaChange={handleRecaptchaChange}
                        handleChangePassword={handleChangePassword}
                        oldPassword={oldPassword}
                        setOldPassword={setOldPassword}
                        newPassword={newPassword}
                        setNewPassword={setNewPassword}
                        confirmPassword={confirmPassword}
                        setConfirmPassword={setConfirmPassword}
                        passwordMessage={passwordMessage}
                        isActionLoading={isActionLoading}
                    />
                </div>
                
                {/* Right Column */}
                <div className="space-y-8">
                    <ContentSection
                        settings={localSettings}
                        onChange={handleSettingsChange}
                        t={t}
                        handlePromptCardSettingChange={handlePromptCardSettingChange}
                    />
                    <GamificationSection
                        settings={localSettings.gamificationSettings || { promptFavorited: 1, promptCollected: 2, promptRemixed: 5, rating5Star: 2, commentReceived: 1 }}
                        onChange={handleGamificationSettingChange}
                        t={t}
                    />
                    <IntegrationSection
                        settings={localSettings}
                        onChange={handleSettingsChange}
                        t={t}
                        tComponent={tComponent}
                        handleWatermarkSettingChange={handleWatermarkSettingChange}
                        handleWatermarkApplyToChange={handleWatermarkApplyToChange}
                        isUploadingLogo={isUploadingLogo}
                        handleLogoChange={handleLogoChange}
                        handleRepeaterChange={handleRepeaterChange}
                        handleRemoveRepeaterItem={handleRemoveRepeaterItem}
                        handleAddRepeaterItem={handleAddRepeaterItem}
                    />
                </div>
            </div>
            <div className="pt-2">
                <button 
                    onClick={handleApplyGeneralSettings} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-md transition-colors w-full flex justify-center text-base" 
                    disabled={isActionLoading}
                >
                    {isActionLoading ? <Spinner size="sm"/> : saveStatus === 'saved' ? t('admin.settings.saved') : t('admin.settings.apply')}
                </button>
            </div>
        </div>
    );
};

export default AdminSettings;