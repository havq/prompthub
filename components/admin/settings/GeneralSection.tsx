



import React from 'react';
import { AppSettings } from '../../../utils/types';
import CollapsibleSection from './CollapsibleSection';
import { Toggle } from './SharedComponents';

interface GeneralSectionProps {
    settings: AppSettings;
    onChange: (key: keyof AppSettings, value: any) => void;
    t: (key: string) => string;
}

const GeneralSection: React.FC<GeneralSectionProps> = ({ settings, onChange, t }) => {
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