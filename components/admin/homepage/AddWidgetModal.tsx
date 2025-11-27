
import React from 'react';
import { WidgetType } from '../../../utils/types';

export const WIDGET_TYPES: { type: WidgetType; label: string }[] = [
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

interface AddWidgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (type: WidgetType) => void;
}

const AddWidgetModal: React.FC<AddWidgetModalProps> = ({ isOpen, onClose, onAdd }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Select Widget Type</h3>
                <div className="grid grid-cols-1 gap-2">
                    {WIDGET_TYPES.map(w => (
                        <button key={w.type} type="button" onClick={() => onAdd(w.type)} className="p-3 text-left bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded border border-transparent hover:border-indigo-500 transition-all">
                            <span className="font-semibold block">{w.label}</span>
                        </button>
                    ))}
                </div>
                <button type="button" onClick={onClose} className="mt-4 w-full py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">Cancel</button>
            </div>
        </div>
    );
};

export default AddWidgetModal;
