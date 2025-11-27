
import React, { useState, useEffect } from 'react';
import { HomeWidget, WidgetType } from '../../utils/types';
import { getSettings, saveSettings } from '../../services/settingsService';
import { useLanguage } from '../../context/LanguageContext';
import { useAdminContext } from '../../context/AdminContext';
import Spinner from '../Spinner';
import ConfirmModal from '../ConfirmModal';
import WidgetEditorModal from './homepage/WidgetEditorModal';
import AddWidgetModal from './homepage/AddWidgetModal';
import WidgetListItem from './homepage/WidgetListItem';

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
        const getDefaultDataForType = (type: WidgetType) => {
            switch(type) {
                case 'banner': return { imageUrl: '', title: 'Welcome', height: 'medium', overlayOpacity: 40 };
                case 'top-contributors': return { title: 'Top Contributors', subtitle: 'Meet our most active community members', limit: 5 };
                case 'featured-comments-slider': return { title: 'TOP BÌNH LUẬN', limit: 10 };
                case 'community-activity': return { 
                    activeTitle: 'SÔI NỔI NHẤT', activeLimit: 5,
                    favoriteTitle: 'YÊU THÍCH NHẤT', favoriteLimit: 5,
                    categoryTitle: 'THỂ LOẠI HOT', categoryLimit: 5,
                    commentTitle: 'BÌNH LUẬN MỚI', commentLimit: 5
                };
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

    const handleUpdateWidget = (updatedData: any) => {
        if (!editingWidget) return;
        setLayout(prev => prev.map(w => w.id === editingWidget.id ? { ...w, data: updatedData } : w));
        setIsEditModalOpen(false);
        setEditingWidget(null);
    };

    const handleEditClick = (widget: HomeWidget) => {
        setEditingWidget(widget);
        setIsEditModalOpen(true);
    }

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
                    <WidgetListItem 
                        key={widget.id}
                        widget={widget}
                        index={index}
                        totalCount={layout.length}
                        onMove={handleMove}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteClick}
                    />
                ))}
            </div>
            
            {isAddModalOpen && (
                <AddWidgetModal 
                    isOpen={isAddModalOpen} 
                    onClose={() => setIsAddModalOpen(false)} 
                    onAdd={handleAddWidget} 
                />
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
