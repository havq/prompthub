
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Category, UserProfile } from '../../utils/types';

interface SettingsSectionProps {
    categories: Category[];
    categoryIds: string[];
    onCategoryChange: (id: string) => void;
    requiresUserImage: boolean;
    setRequiresUserImage: (val: boolean) => void;
    isPrivate: boolean;
    setIsPrivate: (val: boolean) => void;
    isNSFW: boolean;
    setIsNSFW: (val: boolean) => void;
    commentsEnabled: boolean;
    setCommentsEnabled: (val: boolean) => void;
    rotation: number;
    setRotation: (val: number) => void;
    showRotation: boolean;
    userProfile: UserProfile;
    isPro: boolean;
    isAdmin: boolean;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
    categories, categoryIds, onCategoryChange,
    requiresUserImage, setRequiresUserImage,
    isPrivate, setIsPrivate,
    isNSFW, setIsNSFW,
    commentsEnabled, setCommentsEnabled,
    rotation, setRotation, showRotation,
    userProfile, isPro, isAdmin
}) => {
    const { t } = useLanguage();
    const INPUT_STYLE = "block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed";

    return (
        <>
            {showRotation && (
                <div>
                    <label htmlFor="image-rotation-remix" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Image Rotation</label>
                    <select
                        id="image-rotation-remix"
                        value={rotation}
                        onChange={e => setRotation(Number(e.target.value))}
                        className={`mt-1 ${INPUT_STYLE}`}
                    >
                        <option value="0">No rotation</option>
                        <option value="90">Rotate 90° (Clockwise)</option>
                        <option value="-90">Rotate -90° (Counter-clockwise)</option>
                    </select>
                </div>
            )}

            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <input 
                    id="requires-user-image-remix" 
                    type="checkbox" 
                    checked={requiresUserImage} 
                    onChange={e => setRequiresUserImage(e.target.checked)} 
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-400 dark:border-gray-500 bg-gray-200 dark:bg-gray-600 rounded" 
                />
                <label htmlFor="requires-user-image-remix" className="flex-grow flex flex-col cursor-pointer">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Requires User Image</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Check this if the prompt is designed for users to upload their own reference image.</span>
                </label>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.categories')}</label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-gray-100 dark:bg-gray-700">
                    {categories.map(category => (
                        <div key={category.id} className="flex items-center">
                            <input 
                                id={`category-${category.id}`} 
                                type="checkbox" 
                                checked={categoryIds.includes(category.id)} 
                                onChange={() => onCategoryChange(category.id)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-400 dark:border-gray-500 bg-gray-200 dark:bg-gray-600 rounded" 
                            />
                            <label htmlFor={`category-${category.id}`} className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">{category.name}</label>
                        </div>
                    ))}
                </div>
            </div>

            {(isPro || isAdmin) && (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="flex-grow flex flex-col">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('admin.promptForm.isPrivateLabel')}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('admin.promptForm.isPrivateHint')}</span>
                    </span>
                    <label htmlFor="is-private-remix-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="is-private-remix-toggle" className="sr-only peer" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
            )}

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="flex-grow flex flex-col">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('admin.promptForm.isNSFWLabel')}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('admin.promptForm.isNSFWHint')}</span>
                </span>
                <label htmlFor="is-nsfw-remix-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="is-nsfw-remix-toggle" className="sr-only peer" checked={isNSFW} onChange={e => setIsNSFW(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="flex-grow flex flex-col">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('admin.promptForm.commentsEnabled')}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('admin.promptForm.commentsEnabledHint')}</span>
                </span>
                <label htmlFor="comments-enabled-remix-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="comments-enabled-remix-toggle" className="sr-only peer" checked={commentsEnabled} onChange={e => setCommentsEnabled(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </div>
        </>
    );
};

export default SettingsSection;
