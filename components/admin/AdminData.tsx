import React, { useState, useRef } from 'react';
import { Prompt, Category, CategoryWithCount } from '../../utils/types';
import { useLanguage } from '../../context/LanguageContext';
import { addPrompt, addCategory } from '../../services/api';
import ConfirmModal from '../ConfirmModal';
import Spinner from '../Spinner';
import { getSettings, saveSettings } from '../../services/settingsService';

interface AdminDataProps {
    prompts: Prompt[];
    categories: CategoryWithCount[];
    onRefresh: () => void;
}

const AdminData: React.FC<AdminDataProps> = ({ prompts, categories, onRefresh }) => {
    const { t } = useLanguage();
    const promptsImportRef = useRef<HTMLInputElement>(null);
    const categoriesImportRef = useRef<HTMLInputElement>(null);
    const settingsImportRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    
    const [importConfirmState, setImportConfirmState] = useState<{ isOpen: boolean; type: 'prompts' | 'categories' | 'settings' | null; data: any; message: string; }>({ isOpen: false, type: null, data: null, message: '' });

    const handleExport = (data: any, filename: string) => {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = filename;
        link.click();
    };

    const handleExportSettings = () => {
        const currentSettings = { ...getSettings() };
        // Remove sensitive or server-specific data before exporting
        delete (currentSettings as any).firebaseConfig;
        delete (currentSettings as any).adminPassword;
        delete (currentSettings as any).externalApiUrl;
        handleExport(currentSettings, 'settings.json');
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>, type: 'prompts' | 'categories' | 'settings') => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (type === 'settings') {
                    if (typeof data !== 'object' || Array.isArray(data)) {
                        throw new Error("Settings file must contain a JSON object.");
                    }
                    setImportConfirmState({ isOpen: true, type, data, message: t('admin.data.importConfirmMessageSettings') });
                } else {
                    if (!Array.isArray(data)) throw new Error("JSON must contain an array.");
                    setImportConfirmState({ isOpen: true, type, data, message: t('admin.data.importConfirmMessage', { count: data.length, type }) });
                }
            } catch (error) { alert(t('admin.data.importError', { message: error instanceof Error ? error.message : String(error) })); } 
            finally { if (event.target) event.target.value = ''; }
        };
        reader.readAsText(file);
    };
  
    const handleConfirmImport = async () => {
        if (!importConfirmState.type || !importConfirmState.data) return;
        setIsImporting(true);
        try {
            if (importConfirmState.type === 'prompts') {
                if (!Array.isArray(importConfirmState.data) || importConfirmState.data.length === 0) return;
                const promptsToImport: Omit<Prompt, 'id' | 'createdAt'>[] = importConfirmState.data.map(({ text, title, imageUrl, folderIds, folderId, tags, categoryIds }: any) => ({
                    title: title || (String(text || '').substring(0, 50) + (String(text || '').length > 50 ? '...' : '')),
                    text,
                    imageUrl,
                    categoryIds: categoryIds || folderIds || (folderId ? [folderId] : []),
                    tags
                }));
                await Promise.all(promptsToImport.map(p => addPrompt(p)));
            } else if (importConfirmState.type === 'categories') {
                if (!Array.isArray(importConfirmState.data) || importConfirmState.data.length === 0) return;
                const categoriesToImport: Omit<Category, 'id'>[] = importConfirmState.data.map(({ name }: any) => ({ name }));
                await Promise.all(categoriesToImport.map(f => addCategory(f)));
            } else if (importConfirmState.type === 'settings') {
                if (typeof importConfirmState.data !== 'object' || Array.isArray(importConfirmState.data)) return;
                const settingsToImport = importConfirmState.data;
                await saveSettings(settingsToImport);
            }
            alert(t('admin.data.importSuccess'));
            onRefresh();
        } catch (error) {
            console.error('Import failed:', error);
            alert(t('admin.data.importFailed'));
        } finally {
            setIsImporting(false);
            setImportConfirmState({ isOpen: false, type: null, data: null, message: '' });
        }
    };

    return (
        <>
            <input type="file" ref={promptsImportRef} onChange={(e) => handleFileImport(e, 'prompts')} accept=".json" className="hidden" />
            <input type="file" ref={categoriesImportRef} onChange={(e) => handleFileImport(e, 'categories')} accept=".json" className="hidden" />
            <input type="file" ref={settingsImportRef} onChange={(e) => handleFileImport(e, 'settings')} accept=".json" className="hidden" />
            <ConfirmModal isOpen={importConfirmState.isOpen} onClose={() => setImportConfirmState({ isOpen: false, type: null, data: [], message: '' })} onConfirm={handleConfirmImport} title={t('modals.confirmImportTitle')} message={importConfirmState.message} confirmText={t('common.confirm')} isConfirming={isImporting} />
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold mb-6">{t('admin.data.title')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-semibold mb-3">{t('admin.data.export')}</h3>
                        <div className="space-y-3">
                            <button onClick={() => handleExport(prompts, 'prompts.json')} className="w-full text-left p-3 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">{t('admin.data.exportPrompts')}</button>
                            <button onClick={() => handleExport(categories, 'categories.json')} className="w-full text-left p-3 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">{t('admin.data.exportCategories')}</button>
                            <button onClick={handleExportSettings} className="w-full text-left p-3 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">{t('admin.data.exportSettings')}</button>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-3">{t('admin.data.import')}</h3>
                        <div className="space-y-3">
                            <button onClick={() => promptsImportRef.current?.click()} className="w-full text-left p-3 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">{t('admin.data.importPrompts')}</button>
                            <button onClick={() => categoriesImportRef.current?.click()} className="w-full text-left p-3 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">{t('admin.data.importCategories')}</button>
                            <button onClick={() => settingsImportRef.current?.click()} className="w-full text-left p-3 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">{t('admin.data.importSettings')}</button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">{t('admin.data.importNote')}</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminData;