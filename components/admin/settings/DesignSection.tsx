import React from 'react';
import { AppSettings, Badge, SocialLink, NotificationBarSettings, LanguageSettings, Language } from '../../../types';
import CollapsibleSection from './CollapsibleSection';
import { Toggle } from './SharedComponents';
import Spinner from '../../Spinner';
import BadgeIcon from '../../BadgeIcon';
import FooterLinksEditor from '../../FooterLinksEditor';

interface DesignSectionProps {
    settings: AppSettings;
    onChange: (key: keyof AppSettings, value: any) => void;
    t: (key: string) => string;
    isUploadingLogo: string | null;
    handleLogoChange: (e: React.ChangeEvent<HTMLInputElement>, type: 'light' | 'dark') => void;
    allBadges: Badge[];
    handleBadgeIconUploadClick: (badge: Badge) => void;
    handleRemoveBadgeIcon: (badge: Badge) => void;
    isUploadingBadgeIcon: boolean;
    uploadingBadge: Badge | null;
    badgeIconUploadRef: React.RefObject<HTMLInputElement>;
    handleBadgeIconFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleAddFooterSocialLink: () => void;
    handleFooterSocialLinkChange: (index: number, field: keyof SocialLink, value: string) => void;
    handleRemoveFooterSocialLink: (index: number) => void;
    socialPlatformOptions: string[];
    handleNotificationBarChange: (field: keyof NotificationBarSettings, value: any) => void;
    handleLanguageSettingChange: (lang: keyof LanguageSettings, value: boolean) => void;
}

const DesignSection: React.FC<DesignSectionProps> = ({
    settings, onChange, t,
    isUploadingLogo, handleLogoChange,
    allBadges, handleBadgeIconUploadClick, handleRemoveBadgeIcon,
    isUploadingBadgeIcon, uploadingBadge, badgeIconUploadRef, handleBadgeIconFileChange,
    handleAddFooterSocialLink, handleFooterSocialLinkChange, handleRemoveFooterSocialLink, socialPlatformOptions,
    handleNotificationBarChange, handleLanguageSettingChange
}) => {
    return (
        <>
            <input type="file" ref={badgeIconUploadRef} onChange={handleBadgeIconFileChange} accept="image/*" className="hidden" />
            <CollapsibleSection title="Appearance & Branding">
                <div className="space-y-4">
                    <div><label htmlFor="app-logo-light" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.appLogoLight')}</label><div className="flex gap-2"><input type="text" id="app-logo-light" placeholder={t('admin.settings.appLogoPlaceholder')} value={settings.appLogoLight || ''} onChange={e => onChange('appLogoLight', e.target.value)} className="flex-grow bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"/><label className="cursor-pointer bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors flex justify-center items-center w-28">{isUploadingLogo === 'light' ? <Spinner size="sm" /> : t('admin.settings.upload')}<input type="file" accept="image/*" onChange={(e) => handleLogoChange(e, 'light')} className="hidden" disabled={!!isUploadingLogo} /></label></div></div>
                    <div><label htmlFor="app-logo-dark" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.appLogoDark')}</label><div className="flex gap-2"><input type="text" id="app-logo-dark" placeholder={t('admin.settings.appLogoPlaceholder')} value={settings.appLogoDark || ''} onChange={e => onChange('appLogoDark', e.target.value)} className="flex-grow bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"/><label className="cursor-pointer bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors flex justify-center items-center w-28">{isUploadingLogo === 'dark' ? <Spinner size="sm" /> : t('admin.settings.upload')}<input type="file" accept="image/*" onChange={(e) => handleLogoChange(e, 'dark')} className="hidden" disabled={!!isUploadingLogo}/></label></div></div>
                    <div>
                        <label htmlFor="default-theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.defaultTheme')}</label>
                        <select id="default-theme" value={settings.defaultTheme} onChange={e => onChange('defaultTheme', e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600">
                            <option value="system">{t('admin.settings.themeSystem')}</option>
                            <option value="light">{t('admin.settings.themeLight')}</option>
                            <option value="dark">{t('admin.settings.themeDark')}</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="header-style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Header Style</label>
                        <select id="header-style" value={settings.headerStyle || 'style1'} onChange={e => onChange('headerStyle', e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2">
                            <option value="style1">Style 1 (Default: Left-aligned)</option>
                            <option value="style2">Style 2 (Centered Logo)</option>
                            <option value="style3">Style 3 (Minimal)</option>
                        </select>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Choose the default header layout for desktop and mobile screen sizes.</p>
                    </div>
                    <div>
                        <label htmlFor="header-style-tablet" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Header Style (Tablet)</label>
                        <select id="header-style-tablet" value={settings.headerStyleTablet || 'style1'} onChange={e => onChange('headerStyleTablet', e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2">
                            <option value="style1">Style 1 (Default: Left-aligned)</option>
                            <option value="style2">Style 2 (Centered Logo)</option>
                            <option value="style3">Style 3 (Minimal)</option>
                        </select>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Choose the header layout for tablet screen sizes (e.g., 768px to 1024px).</p>
                    </div>
                    <div>
                        <label htmlFor="footer-style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Footer Style</label>
                        <select id="footer-style" value={settings.footerStyle || 'style1'} onChange={e => onChange('footerStyle', e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2">
                            <option value="style1">Style 1 (Default: Detailed)</option>
                            <option value="style2">Style 2 (Simple Centered)</option>
                            <option value="style3">Style 3 (Sitemap)</option>
                        </select>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Choose the layout for the main site footer.</p>
                    </div>
                    <div>
                        <label htmlFor="default-home-page" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.defaultHomePage')}</label>
                        <select 
                            id="default-home-page" 
                            value={settings.defaultHomePage || 'prompts'} 
                            onChange={e => onChange('defaultHomePage', e.target.value as any)} 
                            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"
                        >
                            <option value="prompts">{t('admin.settings.prompts')}</option>
                            <option value="posts">{t('admin.settings.posts')}</option>
                            <option value="reels/explore">{t('admin.settings.reels')}</option>
                        </select>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.settings.defaultHomePageHint')}</p>
                    </div>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Language Settings">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="default-language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.defaultLanguage')}</label>
                        <select id="default-language" value={settings.defaultLanguage} onChange={e => onChange('defaultLanguage', e.target.value as Language)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600">
                            <option value="vi">{t('admin.settings.vietnamese')}</option>
                            <option value="en">{t('admin.settings.english')}</option>
                            <option value="zh">{t('admin.settings.chinese')}</option>
                            <option value="ko">{t('admin.settings.korean')}</option>
                        </select>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Choose which languages are available for users to select in the language switcher.</p>
                    <Toggle checked={settings.languageSettings?.en ?? true} onChange={val => handleLanguageSettingChange('en', val)} label="Enable English" hint="Show 'English' in the language dropdown." />
                    <Toggle checked={settings.languageSettings?.vi ?? true} onChange={val => handleLanguageSettingChange('vi', val)} label="Enable Vietnamese" hint="Show 'Tiếng Việt' in the language dropdown." />
                    <Toggle checked={settings.languageSettings?.zh ?? true} onChange={val => handleLanguageSettingChange('zh', val)} label="Enable Chinese" hint="Show '中文' in the language dropdown." />
                    <Toggle checked={settings.languageSettings?.ko ?? true} onChange={val => handleLanguageSettingChange('ko', val)} label="Enable Korean" hint="Show '한국어' in the language dropdown." />
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Notification Bar">
                <div className="space-y-4">
                    <Toggle checked={settings.notificationBarSettings?.enabled ?? false} onChange={val => handleNotificationBarChange('enabled', val)} label="Enable Notification Bar" hint="Display a sticky notification bar on the site." />
                    {settings.notificationBarSettings?.enabled && (
                        <>
                            <div>
                                <label htmlFor="notif-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                                <textarea id="notif-message" rows={3} value={settings.notificationBarSettings?.message || ''} onChange={(e) => handleNotificationBarChange('message', e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2" placeholder="Enter your notification message. Basic HTML is allowed." />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="notif-btn-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Button Text</label>
                                    <input type="text" id="notif-btn-text" value={settings.notificationBarSettings?.buttonText || ''} onChange={(e) => handleNotificationBarChange('buttonText', e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2" placeholder="e.g., Learn More" />
                                </div>
                                <div>
                                    <label htmlFor="notif-btn-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Button URL</label>
                                    <input type="url" id="notif-btn-url" value={settings.notificationBarSettings?.buttonUrl || ''} onChange={(e) => handleNotificationBarChange('buttonUrl', e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2" placeholder="https://example.com" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="notif-position" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
                                <select id="notif-position" value={settings.notificationBarSettings?.position || 'top'} onChange={(e) => handleNotificationBarChange('position', e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2">
                                    <option value="top">Top</option>
                                    <option value="bottom">Bottom</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="notif-bg-color" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Background Color</label>
                                    <input type="color" id="notif-bg-color" value={settings.notificationBarSettings?.backgroundColor || '#1f2937'} onChange={(e) => handleNotificationBarChange('backgroundColor', e.target.value)} className="mt-1 w-full h-10 p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer" />
                                </div>
                                <div>
                                    <label htmlFor="notif-text-color" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Text Color</label>
                                    <input type="color" id="notif-text-color" value={settings.notificationBarSettings?.textColor || '#ffffff'} onChange={(e) => handleNotificationBarChange('textColor', e.target.value)} className="mt-1 w-full h-10 p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer" />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Custom Badge Icons">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Override the default SVG icons for badges with your own images. Uploaded images will be used across the site.</p>
                <div className="space-y-4">
                    {allBadges.map(badge => (
                        <div key={badge} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <BadgeIcon badge={badge} size="md" />
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{t(`badges.${badge}.title` as any)}</p>
                                {settings.customBadgeIcons?.[badge] ? (
                                    <div className="flex items-center gap-2 mt-1">
                                        <img src={settings.customBadgeIcons[badge]} alt="Custom Icon" className="h-8 w-8 rounded-full object-cover" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{settings.customBadgeIcons[badge]}</span>
                                    </div>
                                ) : (<p className="text-xs text-gray-500 dark:text-gray-400">Using default icon</p>)}
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-2">
                                {settings.customBadgeIcons?.[badge] && (
                                    <button type="button" onClick={() => handleRemoveBadgeIcon(badge)} className="bg-red-600 hover:bg-red-700 text-white font-bold p-2 rounded-md text-xs flex justify-center items-center" title="Remove custom icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                                <button type="button" onClick={() => handleBadgeIconUploadClick(badge)} disabled={isUploadingBadgeIcon} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-3 rounded-md text-xs w-24 flex justify-center items-center">
                                    {(isUploadingBadgeIcon && uploadingBadge === badge) ? <Spinner size="sm" /> : 'Upload'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Footer Customization">
                <div className="space-y-6">
                    <div><label htmlFor="app-introduction" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">App Introduction</label><textarea id="app-introduction" rows={3} value={settings.appIntroduction} onChange={e => onChange('appIntroduction', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600" placeholder="A short description for the footer..."/></div>
                    <div><label htmlFor="footer-copyright" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.footerCopyrightText')}</label><input type="text" id="footer-copyright" value={settings.footerCopyrightText} onChange={e => onChange('footerCopyrightText', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600" placeholder="© {year} Your App Name"/><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.settings.footerCopyrightTextHint')}</p></div>
                    <div><label htmlFor="footer-developed-by" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.footerDevelopedByText')}</label><input type="text" id="footer-developed-by" value={settings.footerDevelopedByText} onChange={e => onChange('footerDevelopedByText', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600" placeholder="Developed by..."/><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.settings.footerDevelopedByTextHint')}</p></div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 className="text-lg font-semibold mb-4">Footer Social Links</h3>
                        <div className="space-y-3">
                            {(settings.footerSocialLinks || []).map((link, index) => (
                                <div key={index} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md space-y-2 border border-gray-200 dark:border-gray-600">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Platform</label>
                                            <select value={link.platform} onChange={e => handleFooterSocialLinkChange(index, 'platform', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm border border-gray-300 dark:border-gray-500 mt-1">
                                                {socialPlatformOptions.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Target</label>
                                            <select value={link.target || '_blank'} onChange={e => handleFooterSocialLinkChange(index, 'target', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm border border-gray-300 dark:border-gray-500 mt-1">
                                                <option value="_blank">New Tab</option>
                                                <option value="_self">Same Tab</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">URL</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <input type="url" placeholder="https://example.com/username" value={link.url} onChange={e => handleFooterSocialLinkChange(index, 'url', e.target.value)} className="flex-grow bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm border border-gray-300 dark:border-gray-500"/>
                                            <button type="button" onClick={() => handleRemoveFooterSocialLink(index)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={handleAddFooterSocialLink} className="w-full text-center py-2 border-2 border-dashed rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium text-gray-600 dark:text-gray-400">
                                + Add Social Link
                            </button>
                        </div>
                    </div>
                    <FooterLinksEditor footerLinks={settings.footerLinks || []} onFooterLinksChange={(links) => onChange('footerLinks', links)} />
                </div>
            </CollapsibleSection>
        </>
    );
};

export default DesignSection;