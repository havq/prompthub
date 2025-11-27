import React, { useState, useEffect } from 'react';
import { HomeWidget, WidgetType, CategoryWithCount, PostCategoryWithCount, ReelCategoryWithCount } from '../../utils/types';
import { getSettings, saveSettings } from '../../services/settingsService';
import { useLanguage } from '../../context/LanguageContext';
import { useAdminContext } from '../../context/AdminContext';
import Spinner from '../Spinner';
import ConfirmModal from '../ConfirmModal';

const WIDGET_TYPES: { type: WidgetType; label: string }[] = [
    { type: 'banner', label: 'Hero Banner' },
    { type: 'featured-comments-slider', label: 'Featured Comments Slider' },
    { type: 'community-activity', label: 'Community Activity (4 Lists)' },
    { type: 'top-contributors', label: 'Top Contributors' },
    { type: 'prompt-grid', label: 'Prompt Grid' },
    { type: 'post-grid', label: 'Post Grid' },
    { type: 'reel-grid', label: 'Reel Grid' },
    { type: 'category-tabs', label: 'Category Tabs' },
    { type: 'rich-text', label: 'Rich Text / HTML' },
];

interface WidgetEditorModalProps {
    widget: HomeWidget;
    onClose: () => void;
    onSave: (data: any) => void;
    categories: CategoryWithCount[];
    postCategories: PostCategoryWithCount[];
    reelCategories: ReelCategoryWithCount[];
}

const WidgetEditorModal: React.FC<WidgetEditorModalProps> = ({ widget, onClose, onSave, categories, postCategories, reelCategories }) => {
    const { type, data } = widget;
    const [formData, setFormData] = useState(data);

    const handleChange = (key: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all">
                <h3 className="text-xl font-bold mb-4 capitalize text-gray-900 dark:text-white">Edit {type.replace(/-/g, ' ')}</h3>
                
                {type === 'banner' && (
                    <div className="space-y-3">
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Image URL</label><input type="text" value={formData.imageUrl} onChange={e => handleChange('imageUrl', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label><input type="text" value={formData.title} onChange={e => handleChange('title', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subtitle</label><input type="text" value={formData.subtitle || ''} onChange={e => handleChange('subtitle', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Button Text</label><input type="text" value={formData.buttonText || ''} onChange={e => handleChange('buttonText', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Button Link</label><input type="text" value={formData.buttonLink || ''} onChange={e => handleChange('buttonLink', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Height</label><select value={formData.height} onChange={e => handleChange('height', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Overlay Opacity (%)</label><input type="number" value={formData.overlayOpacity} onChange={e => handleChange('overlayOpacity', Number(e.target.value))} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                        </div>
                    </div>
                )}

                {type === 'featured-comments-slider' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                            <input 
                                type="text" 
                                value={formData.title ?? ''} 
                                onChange={e => handleChange('title', e.target.value)} 
                                className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                placeholder="TOP BÌNH LUẬN"
                            />
                        </div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Limit</label><input type="number" value={formData.limit || 10} onChange={e => handleChange('limit', Number(e.target.value))} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                    </div>
                )}

                {type === 'community-activity' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Active List Title</label>
                            <input 
                                type="text" 
                                value={formData.activeTitle ?? ''} 
                                onChange={e => handleChange('activeTitle', e.target.value)} 
                                className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                placeholder="SÔI NỔI NHẤT"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Favorite List Title</label>
                            <input 
                                type="text" 
                                value={formData.favoriteTitle ?? ''} 
                                onChange={e => handleChange('favoriteTitle', e.target.value)} 
                                className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                placeholder="YÊU THÍCH NHẤT"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category List Title</label>
                            <input 
                                type="text" 
                                value={formData.categoryTitle ?? ''} 
                                onChange={e => handleChange('categoryTitle', e.target.value)} 
                                className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                placeholder="THỂ LOẠI HOT"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Comment List Title</label>
                            <input 
                                type="text" 
                                value={formData.commentTitle ?? ''} 
                                onChange={e => handleChange('commentTitle', e.target.value)} 
                                className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                placeholder="BÌNH LUẬN MỚI"
                            />
                        </div>
                    </div>
                )}

                {type === 'top-contributors' && (
                    <div className="space-y-3">
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label><input type="text" value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subtitle</label><input type="text" value={formData.subtitle || ''} onChange={e => handleChange('subtitle', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Limit</label><input type="number" value={formData.limit || 5} onChange={e => handleChange('limit', Number(e.target.value))} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Layout</label>
                            <select value={formData.layout || 'grid'} onChange={e => handleChange('layout', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <option value="grid">Grid (Default)</option>
                                <option value="slider">Slider</option>
                            </select>
                        </div>
                    </div>
                )}

                {type === 'prompt-grid' && (
                    <div className="space-y-3">
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section Title</label><input type="text" value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Link (Optional)</label>
                            <input type="text" value={formData.customLink || ''} onChange={e => handleChange('customLink', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="/prompts or https://example.com" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                                <select value={formData.categoryId || 'All'} onChange={e => handleChange('categoryId', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                    <option value="All">All Categories</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sort By</label><select value={formData.sort || 'newest'} onChange={e => handleChange('sort', e.target.value)} className="w-full border rounded p-2 dark:bg-gray-700 bg-white dark:border-gray-600 dark:text-white"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="rating">Highest Rated</option><option value="views">Most Viewed</option></select></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Limit</label><input type="number" value={formData.limit || 8} onChange={e => handleChange('limit', Number(e.target.value))} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">View Mode</label>
                                <select value={formData.viewMode || 'grid'} onChange={e => handleChange('viewMode', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                    <option value="grid">Grid</option>
                                    <option value="list">List</option>
                                    <option value="compact">Compact</option>
                                    <option value="slider-1">Slider (1 Row)</option>
                                    <option value="slider-2">Slider (2 Rows)</option>
                                </select>
                            </div>
                        </div>
                        
                        {['grid', 'compact', 'slider-1', 'slider-2'].includes(formData.viewMode || 'grid') && (
                            <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg space-y-3 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">Columns Configuration</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Mobile</label>
                                        <select value={formData.mobileCols || 1} onChange={e => handleChange('mobileCols', Number(e.target.value))} className="w-full text-sm border rounded p-1.5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                            <option value="1">1 Col</option>
                                            <option value="2">2 Cols</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tablet (MD)</label>
                                        <select value={formData.tabletCols || 3} onChange={e => handleChange('tabletCols', Number(e.target.value))} className="w-full text-sm border rounded p-1.5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                            {[1,2,3,4].map(n => <option key={n} value={n}>{n} Cols</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Desktop (LG+)</label>
                                        <select value={formData.desktopCols || 4} onChange={e => handleChange('desktopCols', Number(e.target.value))} className="w-full text-sm border rounded p-1.5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                            {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} Cols</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Tag (Optional)</label><input type="text" value={formData.tag || ''} onChange={e => handleChange('tag', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                    </div>
                )}

                {type === 'post-grid' && (
                    <div className="space-y-3">
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section Title</label><input type="text" value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Link (Optional)</label>
                            <input type="text" value={formData.customLink || ''} onChange={e => handleChange('customLink', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="/posts or https://example.com" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Post Category</label>
                                <select value={formData.categoryId || 'All'} onChange={e => handleChange('categoryId', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                    <option value="All">All Categories</option>
                                    {postCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sort By</label><select value={formData.sort || 'newest'} onChange={e => handleChange('sort', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="views">Most Viewed</option><option value="comments">Most Commented</option></select></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Limit</label><input type="number" value={formData.limit || 6} onChange={e => handleChange('limit', Number(e.target.value))} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">View Mode</label><select value={formData.viewMode || 'grid'} onChange={e => handleChange('viewMode', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"><option value="grid">Grid</option><option value="list">List</option></select></div>
                        </div>
                    </div>
                )}

                {type === 'reel-grid' && (
                    <div className="space-y-3">
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section Title</label><input type="text" value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Link (Optional)</label>
                            <input type="text" value={formData.customLink || ''} onChange={e => handleChange('customLink', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="/reels/explore or https://example.com" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reel Category</label>
                                <select value={formData.categoryId || 'All'} onChange={e => handleChange('categoryId', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                    <option value="All">All Categories</option>
                                    {reelCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sort By</label><select value={formData.sort || 'newest'} onChange={e => handleChange('sort', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="views">Most Viewed</option><option value="likes">Most Liked</option></select></div>
                        </div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Limit</label><input type="number" value={formData.limit || 5} onChange={e => handleChange('limit', Number(e.target.value))} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                    </div>
                )}

                {type === 'rich-text' && (
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">HTML Content</label><textarea rows={6} value={formData.content} onChange={e => handleChange('content', e.target.value)} className="w-full border rounded p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm" /></div>
                )}

                {type === 'category-tabs' && <p className="text-gray-500 dark:text-gray-400">This widget displays the category selection tabs. No configuration needed.</p>}

                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
                    <button type="button" onClick={() => onSave(formData)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save Widget</button>
                </div>
            </div>
        </div>
    );
};


const AdminHomepage: React.FC = () => {
    const { t } = useLanguage();
    const { categories, postCategories, reelCategories } = useAdminContext();
    const [layout, setLayout] = useState<HomeWidget[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [editingWidget, setEditingWidget] = useState<HomeWidget | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deletingWidgetId, setDeletingWidgetId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        const settings = getSettings();
        const sanitizedLayout = (settings.homeLayout || []).map((w: any) => ({
            ...w,
            id: w.id || `widget-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        }));
        setLayout(sanitizedLayout);
    }, []);

    const handleSaveLayout = async () => {
        setIsSaving(true);
        try {
            await saveSettings({ homeLayout: layout });
            alert('Homepage layout saved successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to save layout.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newLayout = [...layout];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newLayout.length) return;
        
        [newLayout[index], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[index]];
        setLayout(newLayout);
    };

    const handleDeleteClick = (id: string) => {
        setDeletingWidgetId(id);
    };

    const handleConfirmDelete = () => {
        if (deletingWidgetId) {
            setLayout(prev => prev.filter(w => w.id !== deletingWidgetId));
            setDeletingWidgetId(null);
        }
    };

    const handleAddWidget = (type: WidgetType) => {
        const newWidget: HomeWidget = {
            id: `widget-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            type,
            data: getDefaultDataForType(type)
        };
        setLayout(prev => [...prev, newWidget]);
        setIsAddModalOpen(false);
        setEditingWidget(newWidget);
        setIsEditModalOpen(true);
    };
    
    const getDefaultDataForType = (type: WidgetType) => {
        switch(type) {
            case 'banner': return { imageUrl: '', title: 'Welcome', height: 'medium', overlayOpacity: 40 };
            case 'top-contributors': return { title: 'Top Contributors', subtitle: 'Meet our most active community members', limit: 5 };
            case 'featured-comments-slider': return { title: 'TOP BÌNH LUẬN', limit: 10 };
            case 'community-activity': return { activeTitle: 'SÔI NỔI NHẤT', favoriteTitle: 'YÊU THÍCH NHẤT', categoryTitle: 'THỂ LOẠI HOT', commentTitle: 'BÌNH LUẬN MỚI' };
            case 'prompt-grid': return { 
                title: 'Latest Prompts', 
                sort: 'newest', 
                limit: 8, 
                viewMode: 'grid', 
                categoryId: 'All',
                desktopCols: 4,
                tabletCols: 3,
                mobileCols: 1
            };
            case 'post-grid': return {
                title: 'Latest Posts',
                sort: 'newest',
                limit: 6,
                viewMode: 'grid',
                categoryId: 'All',
            };
            case 'reel-grid': return {
                title: 'Latest Reels',
                sort: 'newest',
                limit: 5,
                categoryId: 'All',
            };
            case 'rich-text': return { content: '<h2>Welcome</h2><p>Custom content here.</p>' };
            case 'category-tabs': return {};
            default: return {};
        }
    };

    const handleUpdateWidget = (updatedData: any) => {
        if (!editingWidget) return;
        setLayout(prev => prev.map(w => w.id === editingWidget.id ? { ...w, data: updatedData } : w));
        setIsEditModalOpen(false);
        setEditingWidget(null);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            {deletingWidgetId && (
                <ConfirmModal 
                    isOpen={true}
                    onClose={() => setDeletingWidgetId(null)}
                    onConfirm={handleConfirmDelete}
                    title={t('common.delete')}
                    message="Are you sure you want to delete this widget?"
                    confirmText={t('common.delete')}
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Homepage Builder</h2>
                <div className="flex gap-2">
                    <button type="button" onClick={() => setIsAddModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                        + Add Widget
                    </button>
                    <button type="button" onClick={handleSaveLayout} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded flex items-center">
                        {isSaving && <Spinner size="sm" className="mr-2"/>} Save Layout
                    </button>
                </div>
            </div>

            <div className="space-y-2 min-h-[200px] bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                {layout.length === 0 && <p className="text-center text-gray-500 py-10">No widgets added. The homepage will use the default layout.</p>}
                {layout.map((widget, index) => (
                    <div key={widget.id} className="bg-white dark:bg-gray-700 p-4 rounded shadow flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 group">
                        <div className="flex items-center gap-3">
                             <span className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">{widget.type.replace(/-/g, ' ')}</span>
                             <span className="font-medium text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                                 {widget.type === 'prompt-grid' || widget.type === 'post-grid' || widget.type === 'reel-grid' || widget.type === 'banner' || widget.type === 'top-contributors' || widget.type === 'featured-comments-slider' || widget.type === 'community-activity' ? (widget.data.title || widget.data.activeTitle || 'Untitled') :
                                  widget.type === 'category-tabs' ? 'Category Navigation' : 'Rich Text Block'}
                             </span>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                             <button type="button" onClick={() => handleMove(index, 'up')} disabled={index === 0} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30 bg-gray-100 dark:bg-gray-800">▲</button>
                             <button type="button" onClick={() => handleMove(index, 'down')} disabled={index === layout.length - 1} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30 bg-gray-100 dark:bg-gray-800">▼</button>
                             <button 
                                type="button" 
                                onClick={(e) => { e.stopPropagation(); setEditingWidget(widget); setIsEditModalOpen(true); }} 
                                className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                            >
                                Edit
                             </button>
                             <button 
                                type="button" 
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(widget.id); }} 
                                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                            >
                                Delete
                             </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Add Widget Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Select Widget Type</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {WIDGET_TYPES.map(w => (
                                <button key={w.type} type="button" onClick={() => handleAddWidget(w.type)} className="p-3 text-left bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded border border-transparent hover:border-indigo-500 transition-all">
                                    <span className="font-semibold block">{w.label}</span>
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={() => setIsAddModalOpen(false)} className="mt-4 w-full py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">Cancel</button>
                    </div>
                </div>
            )}

            {isEditModalOpen && editingWidget && (
                <WidgetEditorModal 
                    widget={editingWidget} 
                    onClose={() => setIsEditModalOpen(false)} 
                    onSave={handleUpdateWidget} 
                    categories={categories}
                    postCategories={postCategories}
                    reelCategories={reelCategories}
                />
            )}
        </div>
    );
};

export default AdminHomepage;