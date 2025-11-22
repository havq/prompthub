import React, { useState } from 'react';
import { FooterLink } from '../types';
import { useLanguage } from '../context/LanguageContext';
import Spinner from './Spinner';

interface FooterLinksEditorProps {
    footerLinks: FooterLink[];
    onFooterLinksChange: (newLinks: FooterLink[]) => void;
}

const FooterLinksEditor: React.FC<FooterLinksEditorProps> = ({ footerLinks, onFooterLinksChange }) => {
    const { t } = useLanguage();
    const [editingLink, setEditingLink] = useState<Partial<FooterLink> | null>(null);

    const handleSave = () => {
        if (!editingLink || !editingLink.title || !editingLink.url) return;

        if (editingLink.id) { // Editing existing
            onFooterLinksChange(footerLinks.map(link => link.id === editingLink.id ? (editingLink as FooterLink) : link));
        } else { // Adding new
            const newLink: FooterLink = {
                ...editingLink,
                id: `footer-${Date.now()}`,
                order: (footerLinks.length > 0 ? Math.max(...footerLinks.map(l => l.order)) : 0) + 1,
            } as FooterLink;
            onFooterLinksChange([...footerLinks, newLink]);
        }
        setEditingLink(null);
    };

    const handleDelete = (id: string) => {
        onFooterLinksChange(footerLinks.filter(link => link.id !== id));
    };

    const move = (index: number, direction: 'up' | 'down') => {
        const newLinks = [...footerLinks];
        const item = newLinks[index];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= newLinks.length) return;
        
        // Swap orders
        [newLinks[index].order, newLinks[swapIndex].order] = [newLinks[swapIndex].order, newLinks[index].order];
        
        onFooterLinksChange(newLinks.sort((a,b) => a.order - b.order));
    };
    
    const renderForm = () => (
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-3">
            <h4 className="font-semibold">{editingLink?.id ? 'Edit Link' : 'Add New Link'}</h4>
            <input 
                type="text" 
                placeholder="Title" 
                value={editingLink?.title || ''}
                onChange={e => setEditingLink(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"
            />
            <input 
                type="text" 
                placeholder="URL (e.g., /page/about-us or https://...)" 
                value={editingLink?.url || ''}
                onChange={e => setEditingLink(prev => ({ ...prev, url: e.target.value }))}
                className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"
            />
            <select
                value={editingLink?.target || '_self'}
                onChange={e => setEditingLink(prev => ({ ...prev, target: e.target.value as '_self' | '_blank' }))}
                className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"
            >
                <option value="_self">Open in same tab</option>
                <option value="_blank">Open in new tab</option>
            </select>
            <div className="flex justify-end gap-2">
                <button onClick={() => setEditingLink(null)} className="py-1 px-3 text-sm rounded-md">Cancel</button>
                <button onClick={handleSave} className="py-1 px-3 text-sm rounded-md bg-indigo-600 text-white">Save</button>
            </div>
        </div>
    );

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-xl font-semibold mb-4">Footer Links</h3>
            <div className="space-y-2 mb-4">
                {footerLinks.sort((a,b) => a.order - b.order).map((link, index) => (
                    <div key={link.id} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                        <div className="flex flex-col">
                            <button onClick={() => move(index, 'up')} disabled={index === 0} className="disabled:opacity-25">▲</button>
                            <button onClick={() => move(index, 'down')} disabled={index === footerLinks.length - 1} className="disabled:opacity-25">▼</button>
                        </div>
                        <div className="flex-grow">
                            <p className="font-medium">{link.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{link.url}</p>
                        </div>
                        <button onClick={() => setEditingLink(link)} className="text-sm text-indigo-600">Edit</button>
                        <button onClick={() => handleDelete(link.id)} className="text-sm text-red-600">Delete</button>
                    </div>
                ))}
            </div>
            {editingLink ? renderForm() : (
                <button onClick={() => setEditingLink({})} className="w-full text-center py-2 border-2 border-dashed rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    + Add Footer Link
                </button>
            )}
        </div>
    );
};

export default FooterLinksEditor;
