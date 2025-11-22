import React, { useState } from 'react';
import { getSettings, saveSettings } from '../../services/settingsService';
import { PermalinkSettings } from '../../types';
import Spinner from '../Spinner';

const AdminPermalinks: React.FC = () => {
    const [settings, setSettings] = useState<PermalinkSettings>(() => getSettings().permalinkSettings || {});
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

    const handleChange = (key: keyof PermalinkSettings, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveSettings({ permalinkSettings: settings });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Failed to save permalink settings:", error);
            alert("Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const fields: { key: keyof PermalinkSettings; label: string; variables: string; }[] = [
        { key: 'prompts', label: 'Prompts Page Permalink', variables: 'N/A' },
        { key: 'promptsList', label: 'Prompts List Page Permalink', variables: 'N/A' },
        { key: 'prompt', label: 'Prompt Detail Permalink', variables: '%{promptId}%' },
        { key: 'promptCategory', label: 'Prompt Category Permalink', variables: '%{categoryId}%' },
        { key: 'search', label: 'Prompt Search Permalink', variables: '%{searchTerm}%' },
        { key: 'post', label: 'Post Detail Permalink', variables: '%{postId}%' },
        { key: 'postCategory', label: 'Post Category Permalink', variables: '%{categoryId}%' },
        { key: 'postSearch', label: 'Post Search Permalink', variables: '%{searchTerm}%' },
        { key: 'reelsExplore', label: 'Reels Explore Page Permalink', variables: 'N/A' },
        { key: 'reel', label: 'Reel Detail Permalink', variables: '%{reelId}%' },
        { key: 'reelCategory', label: 'Reel Category Permalink', variables: '%{categoryId}%' },
        { key: 'reelSearch', label: 'Reel Search Permalink', variables: '%{searchTerm}%' },
        { key: 'tag', label: 'Tag Permalink', variables: '%{tag}%' },
        { key: 'author', label: 'Author Permalink', variables: '%{authorId}%' },
        { key: 'community', label: 'Community Page Permalink', variables: 'N/A' },
    ];

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Permalink Settings</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Customize the URL structure for your content. Use the provided variables to create SEO-friendly links.
                Changes may require a page refresh to take full effect across the application.
            </p>

            <div className="space-y-6">
                {fields.map(({ key, label, variables }) => (
                    <div key={key}>
                        <label htmlFor={key} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                        <input
                            id={key}
                            type="text"
                            value={settings[key] || ''}
                            onChange={(e) => handleChange(key, e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Available variables: <code>{variables}</code></p>
                    </div>
                ))}
            </div>

            <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-md transition-colors flex justify-center text-base"
                >
                    {isSaving ? <Spinner size="sm" /> : saveStatus === 'saved' ? 'Saved!' : 'Save Permalinks'}
                </button>
            </div>
        </div>
    );
};

export default AdminPermalinks;
