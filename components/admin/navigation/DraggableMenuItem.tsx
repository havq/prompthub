
import React from 'react';
import { NavigationLink } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';

export interface TreeItem extends NavigationLink {
    children: TreeItem[];
}

interface DraggableMenuItemProps {
    item: TreeItem;
    onEdit: (item: NavigationLink) => void;
    onDelete: (item: NavigationLink) => void;
    onMove: (itemId: string, direction: 'up' | 'down') => void;
    onIndent: (itemId: string) => void;
    onOutdent: (itemId: string) => void;
    isFirst: boolean;
    isLast: boolean;
    isTopLevel: boolean;
}

const DraggableMenuItem: React.FC<DraggableMenuItemProps> = ({ item, onEdit, onDelete, onMove, onIndent, onOutdent, isFirst, isLast, isTopLevel }) => {
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

export default DraggableMenuItem;
