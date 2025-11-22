import React, { useState, useMemo, useCallback } from 'react';
import { NavigationLink, BottomTabNavigationLink, Category, StaticPage, PostCategory, CategoryWithCount, PostCategoryWithCount, BottomTabNavigationStyle } from '../types';
import { useLanguage } from '../context/LanguageContext';
import ConfirmModal from './ConfirmModal';
import Spinner from './Spinner';
import { getSettings, saveSettings } from '../services/settingsService';
// FIX: Add missing imports for `buildUrl` and `useAdminContext`.
import { buildUrl } from '../utils/permalinks';
import { useAdminContext } from './AdminDashboard';

// FIX: Changed interface to type to resolve property inheritance issues.
type TreeItem = NavigationLink & {
    children: TreeItem[];
};

const buildTree = (items: NavigationLink[], parentId: string | null = null): TreeItem[] => {
    return items
        .filter(item => (item.parentId || null) === parentId)
        .sort((a, b) => a.order - b.order)
        .map(item => ({
            ...item,
            children: buildTree(items, item.id)
        }));
};

const flattenTreeAndRenumber = (tree: TreeItem[]): NavigationLink[] => {
    const flatList: NavigationLink[] = [];
    const recurse = (nodes: TreeItem[], parentId: string | null) => {
        nodes.forEach((node, index) => {
            const { children, ...rest } = node;
            flatList.push({ ...rest, parentId, order: index });
            if (children.length > 0) {
                recurse(children, node.id);
            }
        });
    };
    recurse(tree, null);
    return flatList;
};

const DraggableMenuItem: React.FC<{
    item: TreeItem;
    onEdit: (item: NavigationLink) => void;
    onDelete: (item: NavigationLink) => void;
    onMove: (itemId: string, direction: 'up' | 'down') => void;
    onIndent: (itemId: string) => void;
    onOutdent: (itemId: string) => void;
    isFirst: boolean;
    isLast: boolean;
    isTopLevel: boolean;
}> = ({ item, onEdit, onDelete, onMove, onIndent, onOutdent, isFirst, isLast, isTopLevel }) => {
    const { t } = useLanguage();
    return (
        <li className="flex flex-col rounded-md">
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                <div className="flex items-center gap-1 mr-3">
                    <button onClick={() => onMove(item.id, 'up')} disabled={isFirst} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-25 disabled:cursor-not-allowed"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>
                    <button onClick={() => onMove(item.id, 'down')} disabled={isLast} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-25 disabled:cursor-not-allowed"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
                    <button onClick={() => onOutdent(item.id)} disabled={isTopLevel} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-25 disabled:cursor-not-allowed"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                     <button onClick={() => onIndent(item.id)} disabled={isFirst} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-25 disabled:cursor-not-allowed"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                </div>
                <div className="flex-grow">
                    <p className="font-semibold text-gray-900 dark:text-white">{t(item.titleKey, {defaultValue: item.titleKey})}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.path}</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button onClick={() => onEdit(item)} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm">{t('common.edit')}</button>
                    <button onClick={() => onDelete(item)} className="text-red-600 dark:text-red-400 hover:underline text-sm">{t('common.delete')}</button>
                </div>
            </div>
            {item.children.length > 0 && (
                <ul className="pl-8 pt-2 space-y-2">
                    {item.children.map((child, index) => (
                        <DraggableMenuItem 
                            key={child.id} 
                            item={child} 
                            onEdit={onEdit} 
                            onDelete={onDelete}
                            onMove={onMove}
                            onIndent={onIndent}
                            onOutdent={onOutdent}
                            isFirst={index === 0}
                            isLast={index === item.children.length - 1}
                            isTopLevel={false}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};

interface AdminNavigationContentProps {
    title: string;
    menuItems: NavigationLink[];
    onItemsChange: (newItems: NavigationLink[]) => void;
    categories: Category[];
    postCategories: PostCategory[];
    staticPages: StaticPage[];
    isBottomTab?: boolean;
}

const AdminNavigationContent: React.FC<AdminNavigationContentProps> = ({ title, menuItems, onItemsChange, categories, postCategories, staticPages, isBottomTab = false }) => {
    const { t } = useLanguage();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<NavigationLink | null>(null);
    const [deletingItem, setDeletingItem] = useState<NavigationLink | null>(null);

    const menuTree = useMemo(() => buildTree(menuItems), [menuItems]);

    const handleOpenForm = (item: NavigationLink | null) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!deletingItem) return;
        const descendants = new Set<string>();
        const findDescendants = (parentId: string) => {
            menuItems.forEach(item => {
                if (item.parentId === parentId) {
                    descendants.add(item.id);
                    findDescendants(item.id);
                }
            });
        };
        findDescendants(deletingItem.id);
        const newItems = menuItems.filter(item => item.id !== deletingItem.id && !descendants.has(item.id));
        onItemsChange(newItems);
        setDeletingItem(null);
    };

    const handleFormSubmit = (itemData: Omit<NavigationLink, 'id' | 'order'> | NavigationLink) => {
        if ('id' in itemData) {
            onItemsChange(menuItems.map(item => item.id === itemData.id ? { ...item, ...itemData } : item));
        } else {
            const newItem: NavigationLink = {
                ...itemData,
                id: `nav-${Date.now()}`,
                order: (menuItems.filter(item => item.parentId === itemData.parentId).length) * 10,
            };
            onItemsChange([...menuItems, newItem]);
        }
        setIsFormOpen(false);
        setEditingItem(null);
    };

    const handleMove = useCallback((itemId: string, direction: 'up' | 'down') => {
        const tree = buildTree(menuItems);
        const findNodeAndParent = (nodes: TreeItem[], id: string, parent: TreeItem | null = null): { node: TreeItem, parent: TreeItem | null, index: number } | null => {
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                if (node.id === id) return { node, parent, index: i };
                const found = findNodeAndParent(node.children, id, node);
                if (found) return found;
            }
            return null;
        };
        const found = findNodeAndParent(tree, itemId);
        if (!found) return;
    
        const siblings = found.parent ? found.parent.children : tree;
        const { index } = found;
    
        if (direction === 'up' && index > 0) [siblings[index], siblings[index - 1]] = [siblings[index - 1], siblings[index]];
        else if (direction === 'down' && index < siblings.length - 1) [siblings[index], siblings[index + 1]] = [siblings[index + 1], siblings[index]];
    
        onItemsChange(flattenTreeAndRenumber(tree));
    }, [menuItems, onItemsChange]);

    const handleIndent = useCallback((itemId: string) => {
        const tree = buildTree(menuItems);
        const findNodeAndParent = (nodes: TreeItem[], id: string, parent: TreeItem | null = null): { node: TreeItem, parent: TreeItem | null, index: number } | null => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === id) return { node: nodes[i], parent, index: i };
                const found = findNodeAndParent(nodes[i].children, id, nodes[i]);
                if (found) return found;
            }
            return null;
        };
        const found = findNodeAndParent(tree, itemId);
        if (!found || found.index === 0 || isBottomTab) return;
    
        const siblings = found.parent ? found.parent.children : tree;
        const nodeToMove = siblings.splice(found.index, 1)[0];
        const newParentNode = siblings[found.index - 1];
        
        newParentNode.children = newParentNode.children || [];
        newParentNode.children.push(nodeToMove);
        
        onItemsChange(flattenTreeAndRenumber(tree));
    }, [menuItems, onItemsChange, isBottomTab]);

    const handleOutdent = useCallback((itemId: string) => {
        const tree = buildTree(menuItems);
        const findNodeAndParents = (nodes: TreeItem[], id: string, parent: TreeItem | null = null, grandParent: TreeItem | null = null): { node: TreeItem, parent: TreeItem | null, grandParent: TreeItem | null } | null => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === id) return { node: nodes[i], parent, grandParent };
                const found = findNodeAndParents(nodes[i].children, id, nodes[i], parent);
                if (found) return found;
            }
            return null;
        };
        const found = findNodeAndParents(tree, itemId);
        if (!found || !found.parent || isBottomTab) return;

        const { node: nodeToMove, parent: currentParent, grandParent } = found;
        const childIndex = currentParent.children.findIndex(c => c.id === itemId);
        currentParent.children.splice(childIndex, 1);
        const parentIndex = grandParent ? grandParent.children.findIndex(c => c.id === currentParent.id) : tree.findIndex(c => c.id === currentParent.id);
        const newSiblings = grandParent ? grandParent.children : tree;
        newSiblings.splice(parentIndex + 1, 0, nodeToMove);
        onItemsChange(flattenTreeAndRenumber(tree));
    }, [menuItems, onItemsChange, isBottomTab]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{title}</h3>
                <button onClick={() => handleOpenForm(null)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm">{t('admin.navigation.addItem')}</button>
            </div>
            {isFormOpen && <NavigationItemForm item={editingItem} allItems={menuItems} categories={categories} postCategories={postCategories} staticPages={staticPages} onClose={() => setIsFormOpen(false)} onSubmit={handleFormSubmit} isBottomTab={isBottomTab} />}
            {deletingItem && <ConfirmModal isOpen={!!deletingItem} onClose={() => setDeletingItem(null)} onConfirm={handleConfirmDelete} title={t('common.delete')} message={t('admin.navigation.deleteConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" />}
            
            {menuTree.length > 0 ? (
                 <ul className="space-y-2">
                    {menuTree.map((item, index) => (
                         <DraggableMenuItem
                            key={item.id}
                            item={item}
                            onEdit={handleOpenForm}
                            onDelete={setDeletingItem}
                            onMove={handleMove}
                            onIndent={handleIndent}
                            // FIX: Passed `handleOutdent` to `onOutdent` prop to resolve a 'Cannot find name' error.
                            onOutdent={handleOutdent}
                            isFirst={index === 0}
                            isLast={index === menuTree.length - 1}
                            isTopLevel={true}
                         />
                    ))}
                 </ul>
            ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t('admin.navigation.noItems')}</p>
            )}
        </div>
    );
};

const Toggle: React.FC<{checked: boolean, onChange: (val: boolean) => void, label: string, hint: string}> = ({ checked, onChange, label, hint }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
       <span className="flex-grow flex flex-col">
           <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
           <span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>
       </span>
       <label className="relative inline-flex items-center cursor-pointer">
           <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
           <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
       </label>
   </div>
);


const AdminNavigation: React.FC<{
    categories: CategoryWithCount[];
    postCategories: PostCategoryWithCount[];
    staticPages: StaticPage[];
}> = ({ categories, postCategories, staticPages }) => {
    const { t } = useLanguage();
    const [settings, setSettings] = useState(() => getSettings());
    const [isResetting, setIsResetting] = useState(false);
    const [isConfirmHeaderResetOpen, setIsConfirmHeaderResetOpen] = useState(false);
    const [isConfirmBottomResetOpen, setIsConfirmBottomResetOpen] = useState(false);
    
    const [bottomTabNavStyle, setBottomTabNavStyle] = useState<BottomTabNavigationStyle>(() => settings.bottomTabNavigationStyle || 'style1');
    const [bottomTabNavEnabled, setBottomTabNavEnabled] = useState<boolean>(() => settings.bottomTabNavigationEnabled ?? true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');


    const handleItemsChange = async (key: 'navigationMenu' | 'bottomTabMenu', newItems: NavigationLink[] | BottomTabNavigationLink[]) => {
        try {
            const newSettings = { ...settings, [key]: newItems };
            await saveSettings({ [key]: newItems });
            setSettings(newSettings); // Update local state after successful save
        } catch (error) {
            console.error(`Failed to save ${key}:`, error);
        }
    };

    const handleStyleChange = async (style: BottomTabNavigationStyle) => {
        setBottomTabNavStyle(style);
        try {
            await saveSettings({ bottomTabNavigationStyle: style });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Failed to save style", error);
            alert("Failed to save style setting.");
        }
    };
    
    const handleEnabledChange = async (enabled: boolean) => {
        setBottomTabNavEnabled(enabled);
        try {
            await saveSettings({ bottomTabNavigationEnabled: enabled });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Failed to save enabled status", error);
            alert("Failed to save setting.");
        }
    };
    
    const handleResetHeaderToDefault = async () => {
        setIsResetting(true);
        try {
            const response = await fetch('/database/settings.json');
            if (!response.ok) throw new Error('Could not fetch default settings file.');
            const defaultSettings = await response.json();
            if (defaultSettings.navigationMenu && Array.isArray(defaultSettings.navigationMenu)) {
                await handleItemsChange('navigationMenu', defaultSettings.navigationMenu);
            } else {
                throw new Error('Default navigation menu not found in settings.json file.');
            }
        } catch (error) {
            alert("Error: " + (error instanceof Error ? error.message : "Could not load default menu."));
        } finally {
            setIsResetting(false);
            setIsConfirmHeaderResetOpen(false);
        }
    };
    
    const handleResetBottomToDefault = async () => {
        setIsResetting(true);
        try {
            const response = await fetch('/database/settings.json');
            if (!response.ok) throw new Error('Could not fetch default settings file.');
            const defaultSettings = await response.json();
            if (defaultSettings.bottomTabMenu && Array.isArray(defaultSettings.bottomTabMenu)) {
                await handleItemsChange('bottomTabMenu', defaultSettings.bottomTabMenu);
            } else {
                throw new Error('Default bottom tab menu not found in settings.json file.');
            }
        } catch (error) {
            alert("Error: " + (error instanceof Error ? error.message : "Could not load default menu."));
        } finally {
            setIsResetting(false);
            setIsConfirmBottomResetOpen(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <h2 className="text-2xl font-bold">{t('admin.navigation.title')}</h2>
                 <div className="flex items-center gap-2">
                    <button onClick={() => setIsConfirmHeaderResetOpen(true)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm">
                        {t('admin.navigation.loadDefaultHeaderMenu')}
                    </button>
                    <button onClick={() => setIsConfirmBottomResetOpen(true)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm">
                        {t('admin.navigation.loadDefaultBottomMenu')}
                    </button>
                </div>
            </div>

            {isConfirmHeaderResetOpen && (
                <ConfirmModal
                    isOpen={isConfirmHeaderResetOpen}
                    onClose={() => setIsConfirmHeaderResetOpen(false)}
                    onConfirm={handleResetHeaderToDefault}
                    title={t('admin.navigation.loadDefaultConfirmTitle')}
                    message={t('admin.navigation.loadDefaultConfirmMessage')}
                    confirmText={t('admin.navigation.loadDefaultConfirmButton')}
                    confirmButtonClass="bg-orange-600 hover:bg-orange-700"
                    isConfirming={isResetting}
                />
            )}

            {isConfirmBottomResetOpen && (
                <ConfirmModal
                    isOpen={isConfirmBottomResetOpen}
                    onClose={() => setIsConfirmBottomResetOpen(false)}
                    onConfirm={handleResetBottomToDefault}
                    title={t('admin.navigation.loadDefaultBottomMenuConfirmTitle')}
                    message={t('admin.navigation.loadDefaultBottomMenuConfirmMessage')}
                    confirmText={t('admin.navigation.loadDefaultConfirmButton')}
                    confirmButtonClass="bg-orange-600 hover:bg-orange-700"
                    isConfirming={isResetting}
                />
            )}
            
            <AdminNavigationContent
                title="Header Navigation Menu"
                menuItems={settings.navigationMenu || []}
                onItemsChange={(items) => handleItemsChange('navigationMenu', items)}
                categories={categories}
                postCategories={postCategories}
                staticPages={staticPages}
            />

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold">Appearance</h3>
                <div className="mt-4 space-y-6">
                    <Toggle
                        checked={bottomTabNavEnabled}
                        onChange={handleEnabledChange}
                        label="Enable Bottom Tab Navigation"
                        hint="Show or hide the main navigation bar at the bottom of the screen on mobile devices."
                    />
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <label htmlFor="bottom-nav-style" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bottom Tab Navigation Style</label>
                        <select 
                            id="bottom-nav-style"
                            value={bottomTabNavStyle}
                            onChange={e => handleStyleChange(e.target.value as BottomTabNavigationStyle)}
                            className="mt-1 block w-full max-w-xs px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                        >
                            <option value="style1">Style 1 (Default)</option>
                            <option value="style2">Style 2 (Labeled Active)</option>
                            <option value="style3">Style 3 (Pill Indicator)</option>
                            <option value="style4">Style 4 (Top Line Indicator)</option>
                            <option value="style5">Style 5 (Circular Icon)</option>
                            <option value="style6">Style 6 (Minimalist Icons)</option>
                        </select>
                    </div>
                </div>
                 {saveStatus === 'saved' && <span className="text-sm text-green-600 dark:text-green-400 mt-2 inline-block">Saved!</span>}
            </div>

            <AdminNavigationContent
                title="Bottom Tab Navigation (Mobile)"
                menuItems={settings.bottomTabMenu || []}
                onItemsChange={(items) => handleItemsChange('bottomTabMenu', items)}
                categories={categories}
                postCategories={postCategories}
                staticPages={staticPages}
                isBottomTab={true}
            />
        </div>
    );
};


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


const AdminNavigationWrapper: React.FC = () => {
    const { staticPages, categories, postCategories } = useAdminContext();
    return <AdminNavigation categories={categories} postCategories={postCategories} staticPages={staticPages} />;
};

export default AdminNavigationWrapper;
