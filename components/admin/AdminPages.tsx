
import React, { useState, useMemo, useCallback, useEffect } from 'react';
// @ts-ignore
import { useLocation, useNavigate } from 'react-router-dom';
import { StaticPage } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAdminContext } from '../../context/AdminContext';
import { addStaticPage, updateStaticPage, deleteStaticPage as apiDeleteStaticPage } from '../../services/api';
import PageForm from '../PageForm';
import ConfirmModal from '../ConfirmModal';

const AdminPages: React.FC = () => {
    const { t } = useLanguage();
    const { staticPages, refreshData } = useAdminContext();
    const location = useLocation();
    const navigate = useNavigate();
    
    const [pageSearchQuery, setPageSearchQuery] = useState('');
    const [isPageFormOpen, setIsPageFormOpen] = useState(false);
    const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
    const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const filteredPages = useMemo(() => {
        if (pageSearchQuery.trim() === '') return staticPages;
        const lowercasedQuery = pageSearchQuery.trim().toLowerCase();
        return staticPages.filter(p => p.title.toLowerCase().includes(lowercasedQuery) || p.slug.toLowerCase().includes(lowercasedQuery));
    }, [staticPages, pageSearchQuery]);
    
    const handleEditPage = useCallback((page: StaticPage) => {
        setEditingPage(page);
        setIsPageFormOpen(true);
    }, []);

    useEffect(() => {
        if (location.state?.action === 'edit-page' && location.state.pageId && staticPages.length > 0) {
            const { pageId } = location.state;
            const pageToEdit = staticPages.find(p => p.id === pageId);
            if (pageToEdit) {
                if (editingPage?.id !== pageId) {
                    handleEditPage(pageToEdit);
                }
                navigate('.', { replace: true, state: {} });
            } else {
                navigate('.', { replace: true, state: {} });
            }
        }
    }, [location.state, staticPages, navigate, handleEditPage, editingPage]);

    const handlePageFormSubmit = async (formData: Omit<StaticPage, 'id' | 'createdAt'> | StaticPage) => {
        setIsActionLoading(true);
        try {
            if ('id' in formData) {
                await updateStaticPage(formData);
            } else {
                await addStaticPage(formData);
            }
            refreshData();
            setIsPageFormOpen(false);
            setEditingPage(null);
        } catch (error) {
            console.error("Failed to submit page:", error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingPageId) return;
        setIsActionLoading(true);
        try {
            await apiDeleteStaticPage(deletingPageId);
            refreshData();
        } catch (error) {
            console.error("Failed to delete page:", error);
        } finally {
            setIsActionLoading(false);
            setDeletingPageId(null);
        }
    };

    return (
        <>
            {isPageFormOpen && <PageForm initialData={editingPage} onSubmit={handlePageFormSubmit} onClose={() => { setIsPageFormOpen(false); setEditingPage(null); }} isSubmitting={isActionLoading} />}
            {deletingPageId && <ConfirmModal isOpen={!!deletingPageId} onClose={() => setDeletingPageId(null)} onConfirm={handleConfirmDelete} title={t('modals.confirmDeleteTitle')} message={t('admin.pages.deleteConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">{t('admin.pages.title')}</h2>
                    <button onClick={() => { setEditingPage(null); setIsPageFormOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">{t('admin.pages.addNew')}</button>
                </div>
                <input type="text" placeholder="Search pages..." value={pageSearchQuery} onChange={e => setPageSearchQuery(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600 mb-4" />
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="p-3">Title</th><th className="p-3">Slug</th><th className="p-3">Created At</th><th className="p-3">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPages.map(page => (
                                <tr key={page.id} className="border-b border-gray-200 dark:border-gray-700">
                                    <td className="p-3 font-medium">{page.title}</td>
                                    <td className="p-3 text-gray-500 dark:text-gray-400">/page/{page.slug}</td>
                                    <td className="p-3 text-gray-500 dark:text-gray-400">{new Date(page.createdAt).toLocaleDateString()}</td>
                                    <td className="p-3"><div className="flex space-x-2"><button onClick={() => handleEditPage(page)} className="text-indigo-600 dark:text-indigo-400 hover:underline">{t('common.edit')}</button><button onClick={() => setDeletingPageId(page.id)} className="text-red-600 dark:text-red-400 hover:underline">{t('common.delete')}</button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default AdminPages;
