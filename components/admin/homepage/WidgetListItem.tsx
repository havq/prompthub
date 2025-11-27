
import React from 'react';
import { HomeWidget } from '../../../utils/types';

interface WidgetListItemProps {
    widget: HomeWidget;
    index: number;
    totalCount: number;
    onMove: (index: number, direction: 'up' | 'down') => void;
    onEdit: (widget: HomeWidget) => void;
    onDelete: (id: string) => void;
}

const WidgetListItem: React.FC<WidgetListItemProps> = ({ widget, index, totalCount, onMove, onEdit, onDelete }) => {
    // Logic to determine display title
    const getDisplayTitle = () => {
         if (widget.type === 'prompt-grid' || widget.type === 'post-grid' || widget.type === 'reel-grid' || widget.type === 'banner' || widget.type === 'top-contributors' || widget.type === 'featured-comments-slider' || widget.type === 'community-activity') {
             return (widget.data.title || widget.data.activeTitle || 'Untitled');
         }
         if (widget.type === 'category-tabs') return 'Category Navigation';
         return 'Rich Text Block';
    };

    return (
        <div className="bg-white dark:bg-gray-700 p-4 rounded shadow flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 group">
            <div className="flex items-center gap-3">
                 <span className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">{widget.type.replace(/-/g, ' ')}</span>
                 <span className="font-medium text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                     {getDisplayTitle()}
                 </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
                 <button type="button" onClick={() => onMove(index, 'up')} disabled={index === 0} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30 bg-gray-100 dark:bg-gray-800">▲</button>
                 <button type="button" onClick={() => onMove(index, 'down')} disabled={index === totalCount - 1} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30 bg-gray-100 dark:bg-gray-800">▼</button>
                 <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); onEdit(widget); }} 
                    className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                    Edit
                 </button>
                 <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); onDelete(widget.id); }} 
                    className="px-3 py-1.5 text-sm bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                >
                    Delete
                 </button>
            </div>
        </div>
    );
};

export default WidgetListItem;
