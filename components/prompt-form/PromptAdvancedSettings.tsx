
import React, { useMemo, useState } from 'react';
import { CategoryWithCount, UserProfile } from '../../types';
import Spinner from '../Spinner';

interface PromptAdvancedSettingsProps {
    categories: CategoryWithCount[];
    categoryIds: string[];
    handleCategoryChange: (id: string) => void;
    isUserAdmin: boolean;
    authorId: string;
    setAuthorId: (val: string) => void;
    users: UserProfile[];
    t: (key: string) => string;
    status: string;
    setStatus: (val: 'pending' | 'approved' | 'rejected') => void;
    isPro: boolean;
    isPrivate: boolean;
    setIsPrivate: (val: boolean) => void;
    isNSFW: boolean;
    setIsNSFW: (val: boolean) => void;
    commentsEnabled: boolean;
    setCommentsEnabled: (val: boolean) => void;
    INPUT_STYLE: string;
    isLoadingCategories?: boolean;
}

const PromptAdvancedSettings: React.FC<PromptAdvancedSettingsProps> = ({
    categories, categoryIds, handleCategoryChange, isUserAdmin, authorId, setAuthorId, users, t,
    status, setStatus, isPro, isPrivate, setIsPrivate, isNSFW, setIsNSFW, commentsEnabled, setCommentsEnabled,
    INPUT_STYLE, isLoadingCategories = false
}) => {
    const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);

    const sortedCategories = useMemo(() => {
        const normalizedCats = categories.map(c => ({
            ...c,
            id: String(c.id),
            // parentId is string type
            parentId: (c.parentId === null || c.parentId === undefined || c.parentId === '0' || c.parentId === '') ? null : String(c.parentId)
        }));

        const childrenMap = new Map<string | null, typeof normalizedCats>();
        normalizedCats.forEach(c => {
            if (!childrenMap.has(c.parentId)) {
                childrenMap.set(c.parentId, []);
            }
            childrenMap.get(c.parentId)!.push(c);
        });

        const result: (CategoryWithCount & { depth: number })[] = [];

        const traverse = (parentId: string | null, depth: number) => {
            const children = childrenMap.get(parentId);
            if (children) {
                children.sort((a, b) => a.name.localeCompare(b.name));
                children.forEach(child => {
                    result.push({ ...child, depth });
                    traverse(child.id, depth + 1);
                });
            }
        };
        traverse(null, 0);

        const resultIds = new Set(result.map(r => r.id));
        const missing = normalizedCats.filter(c => !resultIds.has(c.id));
        if (missing.length > 0) {
            missing.sort((a, b) => a.name.localeCompare(b.name));
            missing.forEach(c => result.push({ ...c, depth: 0 }));
        }

        return result;
    }, [categories]);

    return (
        <>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.categories')}</label>
                <div className={`mt-2 space-y-2 border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-gray-100 dark:bg-gray-700 ${isCategoriesExpanded ? '' : 'max-h-40 overflow-y-auto'}`}>
                    {isLoadingCategories ? (
                        <div className="flex justify-center py-4">
                            <Spinner size="md" className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                    ) : (
                        sortedCategories.map(category => (
                            <div key={category.id} className="flex items-center" style={{ paddingLeft: `${category.depth * 30}px` }}>
                                <input 
                                    id={`category-${category.id}`} 
                                    type="checkbox" 
                                    checked={categoryIds.includes(category.id)} 
                                    onChange={() => {
                                        handleCategoryChange(category.id);
                                        // If we are checking a child (it wasn't checked before), ensure parent is checked
                                        if (!categoryIds.includes(category.id)) {
                                            if (category.parentId && !categoryIds.includes(category.parentId)) {
                                                handleCategoryChange(category.parentId);
                                            }
                                        }
                                    }}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-400 dark:border-gray-500 bg-gray-200 dark:bg-gray-600 rounded" 
                                />
                                <label htmlFor={`category-${category.id}`} className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                                    { category.depth > 0 && <span className="text-gray-400 mr-1">↳</span>}
                                    {category.name}
                                </label>
                            </div>
                        ))
                    )}
                    {!isLoadingCategories && categories.length === 0 && (
                         <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.promptForm.noCategories')}</p>
                    )}
                </div>
                {!isLoadingCategories && sortedCategories.length > 5 && (
                    <button
                        type="button"
                        onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                        className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none"
                    >
                        {isCategoriesExpanded ? t('common.collapse') : t('common.expand')}
                    </button>
                )}
            </div>
            {isUserAdmin && (
                <div>
                    <label htmlFor="prompt-author" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.author')}</label>
                    <select id="prompt-author" value={authorId} onChange={e => setAuthorId(e.target.value)} className={`mt-1 ${INPUT_STYLE}`}>
                        {users.map(u => <option key={u.uid} value={u.uid}>{u.username}</option>)}
                        <option value="">{t('admin.promptForm.authorAnonymousOption')}</option>
                    </select>
                </div>
            )}

            {isUserAdmin && (
                <div>
                    <label htmlFor="prompt-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.status')}</label>
                    <select
                        id="prompt-status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as 'pending' | 'approved' | 'rejected')}
                        className={`mt-1 ${INPUT_STYLE}`}
                    >
                        <option value="approved">{t('common.approved')}</option>
                        <option value="pending">{t('common.pending')}</option>
                        <option value="rejected">{t('common.rejected')}</option>
                    </select>
                </div>
                )}

            {(isPro || isUserAdmin) && (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="flex-grow flex flex-col">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('admin.promptForm.isPrivateLabel')}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('admin.promptForm.isPrivateHint')}</span>
                </span>
                <label htmlFor="is-private-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="is-private-toggle" className="sr-only peer" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
                </div>
            )}

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="flex-grow flex flex-col">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('admin.promptForm.isNSFWLabel')}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('admin.promptForm.isNSFWHint')}</span>
                </span>
                <label htmlFor="is-nsfw-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="is-nsfw-toggle" className="sr-only peer" checked={isNSFW} onChange={e => setIsNSFW(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="flex-grow flex flex-col">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('admin.promptForm.commentsEnabled')}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('admin.promptForm.commentsEnabledHint')}</span>
                </span>
                <label htmlFor="comments-enabled-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="comments-enabled-toggle" className="sr-only peer" checked={commentsEnabled} onChange={e => setCommentsEnabled(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </div>
        </>
    );
};

export default PromptAdvancedSettings;
