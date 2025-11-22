
import React, { useState, useMemo } from 'react';
import { CategoryWithCount } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { addCategory, updateCategory } from '../../services/api';
import Spinner from '../Spinner';

interface AdminCategoriesProps {
    categories: CategoryWithCount[];
    onDelete: (id: string) => void;
    onRefresh: () => void;
}

const AdminCategories: React.FC<AdminCategoriesProps> = ({ categories, onDelete, onRefresh }) => {
    const { t } = useLanguage();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryParent, setNewCategoryParent] = useState<string>('');
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editedCategoryName, setEditedCategoryName] = useState('');
    const [editedCategoryParent, setEditedCategoryParent] = useState<string>('');
    const [categorySearchQuery, setCategorySearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const sortedCategories = useMemo(() => {
        // Robustly normalize IDs and parentIds
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

        // Handle orphans or missing items
        const resultIds = new Set(result.map(r => r.id));
        const missing = normalizedCats.filter(c => !resultIds.has(c.id));
        if (missing.length > 0) {
            missing.sort((a, b) => a.name.localeCompare(b.name));
            missing.forEach(c => result.push({ ...c, depth: 0 }));
        }

        if (categorySearchQuery.trim() !== '') {
            const lowercasedQuery = categorySearchQuery.trim().toLowerCase();
            return result.filter(f => f.name.toLowerCase().includes(lowercasedQuery));
        }
        
        return result;
    }, [categories, categorySearchQuery]);

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setIsLoading('add');
        try {
            await addCategory({ name: newCategoryName, parentId: newCategoryParent || undefined });
            setNewCategoryName('');
            setNewCategoryParent('');
            onRefresh();
        } catch (error) { console.error("Failed to add category:", error); } 
        finally { setIsLoading(null); }
    };

    const handleSaveCategory = async () => {
        if (!editingCategoryId || !editedCategoryName.trim()) return;
        setIsLoading(`save_${editingCategoryId}`);
        try {
            await updateCategory({ id: editingCategoryId, name: editedCategoryName, parentId: editedCategoryParent || undefined });
            setEditingCategoryId(null);
            setEditedCategoryName('');
            setEditedCategoryParent('');
            onRefresh();
        } catch (error) { console.error("Failed to save category:", error); } 
        finally { setIsLoading(null); }
    };

    const startEditing = (category: CategoryWithCount) => {
        setEditingCategoryId(category.id);
        setEditedCategoryName(category.name);
        setEditedCategoryParent(category.parentId || '');
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-4">{t('admin.categories.title')}</h3>
            <div className="mb-4"><input type="text" id="category-search" placeholder={t('admin.categories.searchPlaceholder')} value={categorySearchQuery} onChange={e => setCategorySearchQuery(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"/></div>
            
            <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row items-stretch gap-2 mb-4 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-md">
                <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder={t('admin.categories.newPlaceholder')} className="flex-grow bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600" required disabled={isLoading === 'add'}/>
                <select value={newCategoryParent} onChange={e => setNewCategoryParent(e.target.value)} className="w-full sm:w-48 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600 text-sm">
                    <option value="">No Parent</option>
                    {sortedCategories.map(c => (
                         <option key={c.id} value={c.id}>
                             {'- '.repeat(c.depth)}{c.name}
                         </option>
                    ))}
                </select>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors w-24 flex-shrink-0 flex justify-center items-center" disabled={isLoading === 'add'}>{isLoading === 'add' ? <Spinner size="sm" /> : t('common.add')}</button>
            </form>

            <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {sortedCategories.length > 0 ? sortedCategories.map(category => (
                    <li key={category.id} className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md flex items-center justify-between transition-all duration-200 group">
                        {editingCategoryId === category.id ? ( isLoading === `save_${category.id}` ? (<div className="flex-grow flex justify-center"><Spinner size="sm" /></div>) : (
                            <div className="flex-grow flex flex-col sm:flex-row gap-2 items-center">
                                <input type="text" value={editedCategoryName} onChange={(e) => setEditedCategoryName(e.target.value)} className="flex-grow w-full bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus/>
                                <select value={editedCategoryParent} onChange={e => setEditedCategoryParent(e.target.value)} className="w-full sm:w-40 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="">No Parent</option>
                                    {sortedCategories.filter(c => c.id !== category.id).map(c => (
                                        <option key={c.id} value={c.id}>
                                             {'- '.repeat(c.depth)}{c.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="flex items-center gap-2 ml-2">
                                    <button onClick={handleSaveCategory} className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded hover:bg-green-200 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>
                                    <button onClick={() => setEditingCategoryId(null)} className="p-1.5 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-500 dark:text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                </div>
                            </div>
                        )) : (
                            <div className="flex-grow flex items-center justify-between">
                                <div className="flex items-center" style={{ paddingLeft: `${category.depth * 30}px` }}>
                                     { category.depth > 0 && <span className="text-gray-400 mr-2" style={{ userSelect: 'none' }}>↳</span>}
                                    <span className="text-gray-800 dark:text-gray-200 font-medium">{category.name}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded-full">{category.promptCount || 0}</span>
                                </div>
                                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEditing(category)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg></button>
                                    <button onClick={() => onDelete(category.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                </div>
                            </div>
                        )}
                    </li>
                )) : (<li className="text-center p-4 text-gray-500 dark:text-gray-400">{t('admin.categories.noCategoriesFound')}</li>)}
            </ul>
        </div>
    );
};

export default AdminCategories;
