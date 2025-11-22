import React, { useMemo, useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { getSettings } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BottomTabNavigationLink, BottomTabNavigationStyle } from '../types';
import { buildUrl } from '../utils/permalinks';

const getFinalPath = (item: BottomTabNavigationLink): string => {
    // In the future, this could expand to dynamically build URLs like the main nav
    return item.path;
};

// Type for hierarchical menu items
type TreeItem = BottomTabNavigationLink & {
  children: TreeItem[];
};

// Function to build a tree structure from a flat list of navigation links
const buildTree = (items: BottomTabNavigationLink[], parentId: string | null = null): TreeItem[] => {
    return items
        .filter(item => (item.parentId || null) === parentId)
        .sort((a, b) => a.order - b.order)
        .map(item => ({
            ...item,
            children: buildTree(items, item.id)
        }));
};

const BottomTabNavigation: React.FC = () => {
    const { currentUser } = useAuth();
    const { t } = useLanguage();
    const settings = getSettings();
    const menuItemsFromSettings = settings.bottomTabMenu;
    const style = settings.bottomTabNavigationStyle || 'style1';

    const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
    const navRef = useRef<HTMLElement>(null);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(event.target as Node)) {
                setOpenPopoverId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const menuTree = useMemo(() => {
        let itemsToBuild: BottomTabNavigationLink[];

        if (menuItemsFromSettings && menuItemsFromSettings.length > 0) {
            itemsToBuild = menuItemsFromSettings;
        } else {
            // Generate a default hierarchical menu
            const discoverItem: BottomTabNavigationLink = {
                id: 'btm-default-discover', titleKey: 'header.discover', path: '#', order: 2,
                svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path fill-rule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clip-rule="evenodd" /></svg>`
            };
            itemsToBuild = [
                { id: 'btm-default-home', titleKey: 'common.home', path: '/', order: 1, svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0L1.72 11.47a.75.75 0 001.06 1.06l8.69-8.69z" /><path d="M12 5.432l8.159 8.159c.026.026.05.054.07.084a2.25 2.25 0 01-2.262 3.284l-3.182-3.182a.75.75 0 00-1.06 0l-3.97 3.97a.75.75 0 00-1.06 0l-3.97-3.97a.75.75 0 00-1.06 0l-3.182 3.182a2.25 2.25 0 01-2.262-3.284c.017-.03.044-.058.07-.084L12 5.432z" /></svg>` },
                discoverItem,
                { id: 'btm-default-community', titleKey: 'header.community', path: buildUrl('community', {}), order: 1, parentId: discoverItem.id, svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962c.513-.513.43-1.423-.21-1.933a6.916 6.916 0 00-4.016-1.558 6.84 6.84 0 00-4.016 1.558c-.64.51- .723 1.42-.21 1.933a8.966 8.966 0 0111.923 0zM18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962c.513-.513.43-1.423-.21-1.933a6.916 6.916 0 00-4.016-1.558 6.84 6.84 0 00-4.016 1.558c-.64.51- .723 1.42-.21 1.933a8.966 8.966 0 0111.923 0z" /></svg>` },
                { id: 'btm-default-showcase', titleKey: 'header.showcase', path: '/showcase', order: 2, parentId: discoverItem.id, svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>` },
                { id: 'btm-default-submit', titleKey: 'home.submitPrompt', path: '/submit', order: 3, requiresAuth: true, svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4a1 1 0 011 1v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6V5a1 1 0 011-1z" /></svg>` },
                { id: 'btm-default-profile', titleKey: 'header.profile', path: '/profile', order: 4, requiresAuth: true, svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" /></svg>` },
            ];
        }
        
        const visibleFlatItems = itemsToBuild.filter(item => {
            if (item.requiresAuth && !currentUser) {
                if (item.path === '/submit' || item.path === '/collections') {
                    return true;
                }
                return false;
            }
            if (item.requiresGuest && currentUser) return false;
            return true;
        });

        return buildTree(visibleFlatItems);
    }, [settings.defaultHomePage, menuItemsFromSettings, currentUser]);


    if (menuTree.length === 0) {
        return null;
    }

    const navClasses: Record<BottomTabNavigationStyle, string> = {
        style1: "fixed bottom-4 left-4 right-4 h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 md:hidden z-40",
        style2: "fixed bottom-4 left-4 right-4 h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 md:hidden z-40",
        style3: "fixed bottom-4 left-4 right-4 h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 md:hidden z-40",
        style4: "fixed bottom-0 left-0 right-0 h-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.1)] border-t border-gray-200 dark:border-gray-700 md:hidden z-40",
        style5: "fixed bottom-4 left-4 right-4 h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 md:hidden z-40",
        style6: "fixed bottom-4 left-4 right-4 h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 md:hidden z-40",
    };

    const linkContainerClasses: Record<BottomTabNavigationStyle, string> = {
        style1: "flex justify-around items-center h-full px-2",
        style2: "flex justify-around items-center h-full px-2",
        style3: "flex justify-around items-center h-full px-2",
        style4: "flex justify-around items-center h-full py-2",
        style5: "flex justify-around items-center h-full px-2",
        style6: "flex justify-around items-center h-full px-2",
    };

    const getLinkClasses = (isActive: boolean): string => {
        const base = "flex items-center justify-center transition-all duration-300";
        switch (style) {
            case 'style2': return `${base} flex-col w-16 h-16 rounded-full`;
            case 'style3': return `${base} flex-row items-center gap-1.5 px-3 py-2 rounded-full ${isActive ? 'bg-purple-600 text-white' : 'text-gray-500 dark:text-gray-400'}`;
            case 'style4': return `${base} flex-col relative w-16 h-full pt-1`;
            case 'style5': return `${base} flex-col w-16 h-16`;
            case 'style6': return `${base} w-12 h-12 rounded-full ${isActive ? 'bg-purple-600 text-white' : 'text-gray-500 dark:text-gray-400'}`;
            case 'style1':
            default:
                return `${base} flex-col w-16 h-16 rounded-full ${isActive ? 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`;
        }
    };

    const getTextClasses = (isActive: boolean): string => {
         switch (style) {
            case 'style2': return `text-[10px] font-medium leading-none transition-all duration-300 ${isActive ? 'block mt-0.5' : 'hidden'}`;
            case 'style3': return `text-xs font-medium hidden`;
            case 'style4': return `text-[10px] font-medium leading-none ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`;
            case 'style5': return `text-[10px] font-medium mt-1 transition-colors ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`;
            case 'style6': return `hidden`;
            case 'style1':
            default: return 'text-[10px] font-medium leading-none';
        }
    }

    const getIconContainer = (iconHtml: string, isActive: boolean) => {
        switch (style) {
            case 'style5':
                return <div className={`p-3 rounded-full transition-colors duration-300 ${isActive ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`} dangerouslySetInnerHTML={{ __html: iconHtml }} />;
            case 'style4':
                return <>
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-purple-600 rounded-b-full transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}></div>
                    <div className="w-6 h-6" dangerouslySetInnerHTML={{ __html: iconHtml }} />
                </>
            default:
                 return <div className="w-6 h-6" dangerouslySetInnerHTML={{ __html: iconHtml }} />;
        }
    };


    return (
        <nav ref={navRef} className={navClasses[style]}>
            <div className={linkContainerClasses[style]}>
                {menuTree.map((item) => {
                    const defaultIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
                    const iconHtml = item.svgIcon || defaultIcon;
                    const hasChildren = item.children && item.children.length > 0;
                    const isPopoverOpen = openPopoverId === item.id;

                    return (
                        <div key={item.id} className="relative flex justify-center">
                            {hasChildren ? (
                                <button
                                    onClick={() => setOpenPopoverId(prev => prev === item.id ? null : item.id)}
                                    className={getLinkClasses(isPopoverOpen)}
                                >
                                    {getIconContainer(iconHtml, isPopoverOpen)}
                                    <span className={getTextClasses(isPopoverOpen)}>{t(item.titleKey, {defaultValue: item.titleKey})}</span>
                                </button>
                            ) : (
                                <NavLink
                                    to={getFinalPath(item)}
                                    target={item.target || '_self'}
                                    className={({ isActive }) => getLinkClasses(isActive)}
                                    onClick={() => setOpenPopoverId(null)}
                                    end
                                >
                                    {({ isActive }) => (
                                        <>
                                            {getIconContainer(iconHtml, isActive)}
                                            <span className={getTextClasses(isActive)}>{t(item.titleKey, {defaultValue: item.titleKey})}</span>
                                        </>
                                    )}
                                </NavLink>
                            )}

                            {hasChildren && isPopoverOpen && (
                                <div className="absolute bottom-full mb-3 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 ring-1 ring-black ring-opacity-5 p-2">
                                   <ul className="space-y-1">
                                        {item.children.map(child => (
                                            <li key={child.id}>
                                                <NavLink
                                                    to={getFinalPath(child)}
                                                    onClick={() => setOpenPopoverId(null)}
                                                    className={({isActive}) => `flex items-center gap-3 w-full text-left px-3 py-2 text-sm rounded-md ${isActive ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                                    end
                                                >
                                                    {child.svgIcon && <div className="w-5 h-5 opacity-70" dangerouslySetInnerHTML={{ __html: child.svgIcon }} />}
                                                    <span>{t(child.titleKey, { defaultValue: child.titleKey })}</span>
                                                </NavLink>
                                            </li>
                                        ))}
                                   </ul>
                                   <div className="absolute top-full left-1/2 -translate-x-1/2 mt-[-1px] w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-white dark:border-t-gray-800"></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomTabNavigation;