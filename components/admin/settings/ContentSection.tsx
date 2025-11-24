import React from 'react';
import { AppSettings, PromptCardSettings } from '../../../utils/types';
import CollapsibleSection from './CollapsibleSection';
import { Toggle } from './SharedComponents';

interface ContentSectionProps {
    settings: AppSettings;
    onChange: (key: keyof AppSettings, value: any) => void;
    t: (key: string) => string;
    handlePromptCardSettingChange: <K extends keyof PromptCardSettings>(key: K, value: boolean) => void;
}

const ContentSection: React.FC<ContentSectionProps> = ({ settings, onChange, t, handlePromptCardSettingChange }) => {
    return (
        <>
            <CollapsibleSection title={t('admin.settings.promptsOptionsTitle')}>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="prompts-per-page" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.promptsPerPage')}</label>
                        <input 
                            type="number" 
                            id="prompts-per-page" 
                            value={settings.promptDisplayCount} 
                            onChange={e => onChange('promptDisplayCount', Number(e.target.value))} 
                            min="1"
                            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2"
                        />
                    </div>
                    <div>
                        <label htmlFor="pagination-style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.paginationStyle')}</label>
                        <select 
                            id="pagination-style" 
                            value={settings.paginationStyle || 'pagination'} 
                            onChange={e => onChange('paginationStyle', e.target.value as any)} 
                            className="w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2"
                        >
                            <option value="pagination">{t('admin.settings.pagination')}</option>
                            <option value="infiniteScroll">{t('admin.settings.infiniteScroll')}</option>
                        </select>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h4 className="font-semibold text-gray-800 dark:text-white">Prompt Card Elements</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Control which information and buttons are visible on the prompt cards in the main gallery.</p>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Toggle checked={settings.promptCardSettings?.showViewCount ?? true} onChange={val => handlePromptCardSettingChange('showViewCount', val)} label="Show View Count" hint="Display the eye icon and view counter." />
                            <Toggle checked={settings.promptCardSettings?.showShowcaseCount ?? true} onChange={val => handlePromptCardSettingChange('showShowcaseCount', val)} label="Show Showcase Count" hint="Display the camera icon and showcase counter." />
                            <Toggle checked={settings.promptCardSettings?.showCommentCount ?? true} onChange={val => handlePromptCardSettingChange('showCommentCount', val)} label="Show Comment Count" hint="Display the speech bubble icon and comment counter." />
                            <Toggle checked={settings.promptCardSettings?.showRemixCount ?? true} onChange={val => handlePromptCardSettingChange('showRemixCount', val)} label="Show Remix Count" hint="Display the remix icon and remix counter." />
                            <Toggle checked={settings.promptCardSettings?.showRatings ?? true} onChange={val => handlePromptCardSettingChange('showRatings', val)} label="Show Ratings" hint="Display the star rating component." />
                            <Toggle checked={settings.promptCardSettings?.showCopyButton ?? true} onChange={val => handlePromptCardSettingChange('showCopyButton', val)} label="Show Copy Button" hint="Display the main 'Copy Prompt' button." />
                            <Toggle checked={settings.promptCardSettings?.showRemixButton ?? true} onChange={val => handlePromptCardSettingChange('showRemixButton', val)} label="Show Remix Button" hint="Display the 'Remix' button." />
                        </div>
                    </div>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Posts Options">
                <div className="space-y-6">
                    <div>
                        <label htmlFor="posts-per-page" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Posts Per Page</label>
                        <input 
                            type="number" 
                            id="posts-per-page" 
                            value={settings.postsPerPage || 9} 
                            onChange={e => onChange('postsPerPage', Number(e.target.value))} 
                            min="1"
                            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2"
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">The number of posts to show on the main Posts page.</p>
                    </div>
                    <div>
                        <label htmlFor="related-posts-count" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Related Posts Count</label>
                        <input 
                            type="number" 
                            id="related-posts-count" 
                            value={settings.relatedPostsCount || 5} 
                            onChange={e => onChange('relatedPostsCount', Number(e.target.value))} 
                            min="0"
                            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2"
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">The number of related posts to show on a post detail page.</p>
                    </div>
                    <div>
                        <label htmlFor="posts-pagination-style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.settings.postsPaginationStyle')}</label>
                        <select 
                            id="posts-pagination-style" 
                            value={settings.postsPaginationStyle || 'pagination'} 
                            onChange={e => onChange('postsPaginationStyle', e.target.value as any)} 
                            className="w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2"
                        >
                            <option value="pagination">{t('admin.settings.pagination')}</option>
                            <option value="infiniteScroll">{t('admin.settings.infiniteScroll')}</option>
                        </select>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.settings.postsPaginationStyleHint')}</p>
                    </div>
                </div>
            </CollapsibleSection>
        </>
    );
};

export default ContentSection;