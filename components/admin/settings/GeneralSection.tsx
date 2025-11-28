







import React from 'react';
import { AppSettings } from '../../../utils/types';
import CollapsibleSection from './CollapsibleSection';
import { Toggle } from './SharedComponents';
import Spinner from '../../Spinner';

interface GeneralSectionProps {
    settings: AppSettings;
    onChange: (key: keyof AppSettings, value: any) => void;
    t: (key: string) => string;
    isUploadingFavicon?: boolean;
    handleFaviconChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const GeneralSection: React.FC<GeneralSectionProps> = ({ settings, onChange, t, isUploadingFavicon, handleFaviconChange }) => {
    return (
        <>
            <CollapsibleSection title={t('admin.settings.appSettingsTitle')} defaultOpen={true}>
                <div className="space-y-4">
                        <div>
                        <label htmlFor="app-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Application URL</label>
                        <input type="url" id="app-url" value={settings.appUrl || ''} onChange={e => onChange('appUrl', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600" placeholder="https://your-app-domain.com"/>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">The public URL of your application. Used for generating absolute links like payment return URLs. Do not include a trailing slash.</p>
                    </div>
                    <div>
                        <label htmlFor="site-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.siteTitle')}</label>
                        <input type="text" id="site-title" value={settings.siteTitle || ''} onChange={e => onChange('siteTitle', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600" placeholder="My Awesome App"/>
                         <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">This overrides the default document title.</p>
                    </div>
                    <div>
                        <label htmlFor="site-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.siteDescription')}</label>
                        <textarea id="site-description" rows={2} value={settings.siteDescription || ''} onChange={e => onChange('siteDescription', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600" placeholder="A short description of your site for SEO."/>
                    </div>
                     <div>
                        <label htmlFor="site-keywords" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.siteKeywords')}</label>
                        <input type="text" id="site-keywords" value={settings.siteKeywords || ''} onChange={e => onChange('siteKeywords', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600" placeholder="keyword1, keyword2, keyword3"/>
                    </div>
                    <div>
                        <label htmlFor="app-favicon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.appFavicon')}</label>
                        <div className="flex gap-2">
                            <input type="text" id="app-favicon" placeholder="https://.../favicon.ico" value={settings.faviconUrl || ''} onChange={e => onChange('faviconUrl', e.target.value)} className="flex-grow bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"/>
                             <label className="cursor-pointer bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors flex justify-center items-center w-28">
                                {isUploadingFavicon ? <Spinner size="sm" /> : t('admin.settings.upload')}
                                <input type="file" accept="image/x-icon,image/png,image/jpeg" onChange={handleFaviconChange} className="hidden" disabled={isUploadingFavicon} />
                            </label>
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Supported formats: .ico, .png, .jpg.</p>
                    </div>
                    <div>
                        <label htmlFor="router-mode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Router Mode</label>
                        <select id="router-mode" value={settings.routerMode || 'hash'} onChange={e => onChange('routerMode', e.target.value as any)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600">
                            <option value="hash">Hash Router (e.g., /#/page, for static hosting)</option>
                            <option value="browser">Browser Router (e.g., /page, for VPS with server-side routing)</option>
                        </select>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">After changing this, you may need to reload the app or clear cache. Browser Router requires server configuration to handle all routes.</p>
                    </div>
                    <div>
                        <label htmlFor="image-upload-max-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.imageUploadMaxSize')}</label>
                        <input type="number" id="image-upload-max-size" value={settings.imageUploadMaxSizeMb || 10} onChange={e => onChange('imageUploadMaxSizeMb', Number(e.target.value))} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"/>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.settings.imageUploadMaxSizeHint')}</p>
                    </div>
                    <div><label htmlFor="comment-limit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.commentCharacterLimit')}</label><input type="number" id="comment-limit" value={settings.commentCharacterLimit} onChange={e => onChange('commentCharacterLimit', Number(e.target.value))} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"/><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.settings.commentCharacterLimitHint')}</p></div>
                        <div>
                        <label htmlFor="comments-per-page" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.commentsPerPage')}</label>
                        <input type="number" id="comments-per-page" value={settings.commentsPerPage || 10} onChange={e => onChange('commentsPerPage', Number(e.target.value))} min="1" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"/>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.settings.commentsPerPageHint')}</p>
                    </div>
                    <div>
                        <label htmlFor="comment-cooldown" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.commentCooldown')}</label>
                        <input type="number" id="comment-cooldown" value={settings.commentCooldownSeconds || 0} onChange={e => onChange('commentCooldownSeconds', Number(e.target.value))} min="0" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"/>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.settings.commentCooldownHint')}</p>
                    </div>
                    <div><label htmlFor="comment-rate-limit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.commentRateLimit')}</label><input type="number" id="comment-rate-limit" value={settings.commentRateLimitSeconds || 0} onChange={e => onChange('commentRateLimitSeconds', Number(e.target.value))} min="0" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"/><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.settings.commentRateLimitHint')}</p></div>
                    <div>
                        <label htmlFor="custom-css" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.customCss')}</label>
                        <textarea id="custom-css" rows={4} value={settings.customCss || ''} onChange={e => onChange('customCss', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600 font-mono text-sm" placeholder="body { background-color: #f0f0f0; }"/>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Enter custom CSS here. It will be injected into the page head.</p>
                    </div>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Feature Toggles">
                <div className="space-y-4">
                    <Toggle
                        checked={settings.commentsGloballyEnabled ?? true}
                        onChange={val => onChange('commentsGloballyEnabled', val)}
                        label={t('admin.settings.commentsGloballyEnabled')}
                        hint={t('admin.settings.commentsGloballyEnabledHint')}
                    />
                    <Toggle
                        checked={settings.registrationEnabled ?? true}
                        onChange={val => onChange('registrationEnabled', val)}
                        label={t('admin.settings.registrationEnabled')}
                        hint={t('admin.settings.registrationEnabledHint')}
                    />
                    <Toggle
                        checked={settings.enableShowcaseUploads ?? true}
                        onChange={val => onChange('enableShowcaseUploads', val)}
                        label={t('admin.settings.enableShowcaseUploads')}
                        hint={t('admin.settings.enableShowcaseUploadsHint')}
                    />
                    <Toggle
                        checked={settings.enableVideoUploads ?? true}
                        onChange={val => onChange('enableVideoUploads', val)}
                        label={t('admin.settings.enableVideoUploads')}
                        hint={t('admin.settings.enableVideoUploadsHint')}
                    />
                    <Toggle
                        checked={settings.showGoProButton ?? true}
                        onChange={val => onChange('showGoProButton', val)}
                        label={t('admin.settings.showGoProButton')}
                        hint={t('admin.settings.showGoProButtonHint')}
                    />
                </div>
            </CollapsibleSection>
        </>
    );
};

export default GeneralSection;
