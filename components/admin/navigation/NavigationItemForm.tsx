
import React, { useState, useMemo } from 'react';
import { NavigationLink, Category, PostCategory, StaticPage, BottomTabNavigationLink } from '../../../utils/types';
import { useLanguage } from '../../../context/LanguageContext';
import { buildUrl } from '../../../utils/permalinks';

interface NavigationItemFormProps {
    item: NavigationLink | null;
    allItems: NavigationLink[];
    categories: Category[];
    postCategories: PostCategory[];
    staticPages: StaticPage[];
    onClose: () => void;
    onSubmit: (data: Omit<BottomTabNavigationLink, 'id' | 'order'> | BottomTabNavigationLink) => void;
    isBottomTab?: boolean;
}
  
const NavigationItemForm: React.FC<NavigationItemFormProps> = ({ item, allItems, categories, postCategories, staticPages, onClose, onSubmit, isBottomTab = false }) => {
    const { t } = useLanguage();
    const [titleKey, setTitleKey] = useState(item?.titleKey || '');
    const [linkType, setLinkType] = useState(item?.linkType || 'custom');
    const [path, setPath] = useState(item?.path || '');
    const [linkedId, setLinkedId] = useState(item?.linkedId || '');
    const [target, setTarget] = useState(item?.target || '_self');
    const [parentId, setParentId] = useState(item?.parentId || null);
    const [requiresAuth, setRequiresAuth] = useState(item?.requiresAuth || false);
    const [requiresGuest, setRequiresGuest] = useState(item?.requiresGuest || false);
    const [svgIcon, setSvgIcon] = useState((item as BottomTabNavigationLink)?.svgIcon || '');
    
    const possibleParents = useMemo(() => allItems.filter(p => p.id !== item?.id), [allItems, item]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalPath = path;
        if (linkType === 'category' && linkedId) {
            finalPath = buildUrl('promptCategory', { categoryId: linkedId });
        } else if (linkType === 'post-category' && linkedId) {
            finalPath = buildUrl('postCategory', { categoryId: linkedId });
        } else if (linkType === 'page' && linkedId) {
            const page = staticPages.find(p => p.id === linkedId);
            finalPath = page ? `/page/${page.slug}` : '#';
        }

        const commonData = { 
            titleKey, 
            path: finalPath,
            linkType: linkType as any,
            linkedId: (linkType !== 'custom') ? linkedId : undefined,
            target: target as '_self' | '_blank',
            parentId: (parentId === 'null') ? null : parentId, 
            requiresAuth, 
            requiresGuest
        };

        const itemData = isBottomTab 
            ? { ...commonData, svgIcon }
            : commonData;
        
        onSubmit({ ...(item || {}), ...itemData });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{item ? t('admin.navigation.editItem') : t('admin.navigation.addItem')}</h2>
                    <div>
                        <label htmlFor="titleKey" className="block text-sm font-medium">{t('admin.navigation.headerTitleKey')}</label>
                        <input type="text" id="titleKey" value={titleKey} onChange={e => setTitleKey(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                    </div>
                    {isBottomTab && (
                        <div>
                            <label htmlFor="svgIcon" className="block text-sm font-medium">SVG Icon Code</label>
                            <textarea id="svgIcon" value={svgIcon} onChange={e => setSvgIcon(e.target.value)} rows={3} placeholder='<svg class="h-6 w-6">...</svg>' className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-xs" />
                            <p className="mt-1 text-xs text-gray-500">Paste the full SVG code. If left blank, a default icon will be used.</p>
                        </div>
                    )}
                    <div>
                        <label htmlFor="linkType" className="block text-sm font-medium">{t('admin.navigation.linkType')}</label>
                        <select id="linkType" value={linkType} onChange={e => setLinkType(e.target.value as any)} className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
                            <option value="custom">{t('admin.navigation.linkTypeCustom')}</option>
                            <option value="category">{t('admin.navigation.linkTypeCategory')}</option>
                            <option value="post-category">{t('admin.navigation.linkTypePostCategory')}</option>
                            <option value="page">{t('admin.navigation.linkTypePage')}</option>
                        </select>
                    </div>

                    {linkType === 'custom' && (
                        <div>
                            <label htmlFor="path" className="block text-sm font-medium">{t('admin.navigation.headerPath')}</label>
                            <input type="text" id="path" value={path} onChange={e => setPath(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                        </div>
                    )}
                    {linkType === 'category' && (<div><label htmlFor="linkedId-category" className="block text-sm font-medium">{t('admin.navigation.linkTypeCategory')}</label><select id="linkedId-category" value={linkedId} onChange={e => setLinkedId(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"><option value="">Select a category...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>)}
                    {linkType === 'post-category' && (<div><label htmlFor="linkedId-post-category" className="block text-sm font-medium">{t('admin.navigation.linkTypePostCategory')}</label><select id="linkedId-post-category" value={linkedId} onChange={e => setLinkedId(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"><option value="">Select a post category...</option>{postCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>)}
                    {linkType === 'page' && (<div><label htmlFor="linkedId-page" className="block text-sm font-medium">{t('admin.navigation.linkTypePage')}</label><select id="linkedId-page" value={linkedId} onChange={e => setLinkedId(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"><option value="">Select a page...</option>{staticPages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>)}
                    
                    <div><label htmlFor="target" className="block text-sm font-medium">{t('admin.navigation.headerTarget')}</label><select id="target" value={target} onChange={e => setTarget(e.target.value as any)} className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"><option value="_self">{t('admin.navigation.targetSelf')}</option><option value="_blank">{t('admin.navigation.targetBlank')}</option></select></div>
                    
                    <div>
                        <label htmlFor="parentId" className="block text-sm font-medium">{t('admin.navigation.headerParent')}</label>
                        <select id="parentId" value={parentId || 'null'} onChange={e => setParentId(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
                            <option value="null">{t('admin.navigation.noParent')}</option>
                            {possibleParents.filter(p => !p.parentId).map(p => <option key={p.id} value={p.id}>{t(p.titleKey, {defaultValue: p.titleKey})}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">{t('admin.navigation.headerRules')}</label>
                        <div className="mt-2 space-y-2">
                            <label className="flex items-center"><input type="checkbox" checked={requiresAuth} onChange={e => setRequiresAuth(e.target.checked)} className="h-4 w-4 rounded" /> <span className="ml-2">{t('admin.navigation.requiresAuth')}</span></label>
                            <label className="flex items-center"><input type="checkbox" checked={requiresGuest} onChange={e => setRequiresGuest(e.target.checked)} className="h-4 w-4 rounded" /> <span className="ml-2">{t('admin.navigation.requiresGuest')}</span></label>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={onClose} className="py-2 px-4 border rounded-md text-sm font-medium">{t('common.cancel')}</button><button type="submit" className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">{t('common.save')}</button></div>
                </form>
            </div>
        </div>
    );
};

export default NavigationItemForm;
