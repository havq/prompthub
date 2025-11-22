
import React, { useState, useMemo, useRef, useEffect } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { Prompt, Category, UserProfile, CategoryWithCount } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { deletePrompt as apiDeletePrompt, updatePrompt, getAllAverageRatings } from '../../services/api';
import ConfirmModal from '../ConfirmModal';
import Pagination from '../Pagination';
import Spinner from '../Spinner';
import { buildUrl } from '../../utils/permalinks';

interface AdminPromptsProps {
    prompts: Prompt[];
    categories: CategoryWithCount[];
    users: UserProfile[];
    onAdd: () => void;
    onEdit: (prompt: Prompt) => void;
    onDelete: (id: string) => void;
    onRefresh: () => void;
}

const PROMPTS_PER_PAGE = 12;

const getImageUrls = (imageUrlValue: string | undefined): string[] => {
    if (!imageUrlValue) return [];
    if (imageUrlValue.startsWith('[') && imageUrlValue.endsWith(']')) {
        try {
            const parsed = JSON.parse(imageUrlValue);
            if (Array.isArray(parsed)) {
                return parsed.filter(url => typeof url === 'string' && url.length > 0);
            }
        } catch (e) {
            // Not a valid JSON array
        }
    }
    return [imageUrlValue];
};

const AdminPrompts: React.FC<AdminPromptsProps> = ({ prompts, categories, users, onAdd, onEdit, onDelete, onRefresh }) => {
    const { t } = useLanguage();
    
    const [selectedCategory, setSelectedCategory] = useState<string | 'All'>('All');
    const [selectedUser, setSelectedUser] = useState<string | 'All'>('All');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
    const [promptSearchQuery, setPromptSearchQuery] = useState('');
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
    const [averageRatings, setAverageRatings] = useState<Record<string, { average: number; count: number }>>({});

    useEffect(() => {
        getAllAverageRatings().then(setAverageRatings);
    }, [prompts]);

    const filteredPrompts = useMemo(() => {
        let tempPrompts = prompts;
        if (statusFilter !== 'all') {
            tempPrompts = tempPrompts.filter(p => (p.status || 'approved') === statusFilter);
        }
        if (selectedCategory !== 'All') {
            tempPrompts = tempPrompts.filter(p => p.categoryIds?.includes(selectedCategory));
        }
        if (selectedUser !== 'All') {
            tempPrompts = selectedUser === ''
                ? tempPrompts.filter(p => !p.authorId)
                : tempPrompts.filter(p => p.authorId === selectedUser);
        }
        if (promptSearchQuery.trim() !== '') {
            const lowercasedQuery = promptSearchQuery.trim().toLowerCase();
            tempPrompts = tempPrompts.filter(p =>
                p.text.toLowerCase().includes(lowercasedQuery) ||
                p.tags?.some(tag => tag.toLowerCase().includes(lowercasedQuery))
            );
        }
        // Explicitly sort by newest first to ensure correct order after filtering.
        // Create a copy to avoid mutating the original array from context.
        return [...tempPrompts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [prompts, selectedCategory, selectedUser, promptSearchQuery, statusFilter]);
  
    const paginatedPrompts = useMemo(() => {
        const startIndex = (currentPage - 1) * PROMPTS_PER_PAGE;
        return filteredPrompts.slice(startIndex, startIndex + PROMPTS_PER_PAGE);
    }, [filteredPrompts, currentPage]);

    const totalPages = Math.ceil(filteredPrompts.length / PROMPTS_PER_PAGE);

    useEffect(() => {
        const newTotalPages = Math.ceil(filteredPrompts.length / PROMPTS_PER_PAGE);
        if (newTotalPages > 0 && currentPage > newTotalPages) setCurrentPage(newTotalPages);
        else if (newTotalPages === 0 && currentPage > 1) setCurrentPage(1);
    }, [filteredPrompts, currentPage]);

    const handleToggleSelectAllOnPage = () => {
        const promptIdsOnPage = paginatedPrompts.map(p => p.id);
        const allSelectedOnPage = promptIdsOnPage.every(id => selectedPrompts.includes(id));
        setSelectedPrompts(allSelectedOnPage
            ? prev => prev.filter(id => !promptIdsOnPage.includes(id))
            : [...new Set([...selectedPrompts, ...promptIdsOnPage])]
        );
    };

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true);
        try {
            await Promise.all(selectedPrompts.map(id => apiDeletePrompt(id)));
            setSelectedPrompts([]);
            onRefresh();
        } catch (error) {
            console.error("Failed to bulk delete prompts:", error);
            alert("An error occurred during bulk deletion.");
        } finally {
            setIsBulkDeleting(false);
            setIsBulkDeleteConfirmOpen(false);
        }
    };

    const handleStatusUpdate = async (prompt: Prompt, status: 'approved' | 'rejected') => {
        setUpdatingStatusId(prompt.id);
        try {
            await updatePrompt({ ...prompt, status });
            onRefresh();
        } catch (error) {
            console.error(`Failed to update prompt status to ${status}:`, error);
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const headerCheckboxRef = useRef<HTMLInputElement>(null);
    const promptIdsOnPage = useMemo(() => paginatedPrompts.map(p => p.id), [paginatedPrompts]);
    const selectedOnPageCount = useMemo(() => promptIdsOnPage.filter(id => selectedPrompts.includes(id)).length, [promptIdsOnPage, selectedPrompts]);

    useEffect(() => {
        if (headerCheckboxRef.current) {
            headerCheckboxRef.current.checked = selectedOnPageCount > 0 && selectedOnPageCount === promptIdsOnPage.length;
            headerCheckboxRef.current.indeterminate = selectedOnPageCount > 0 && selectedOnPageCount < promptIdsOnPage.length;
        }
    }, [selectedOnPageCount, promptIdsOnPage.length]);

    const statusColors = {
        pending: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
        approved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
        rejected: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            {isBulkDeleteConfirmOpen && (
                <ConfirmModal
                    isOpen={isBulkDeleteConfirmOpen}
                    onClose={() => setIsBulkDeleteConfirmOpen(false)}
                    onConfirm={handleBulkDelete}
                    title={t('modals.confirmDeleteTitle')}
                    message={t('admin.prompts.deleteBulkConfirm', { count: selectedPrompts.length })}
                    confirmText={t('common.delete')}
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                    isConfirming={isBulkDeleting}
                />
            )}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{t('admin.prompts.title')}<span className="text-base font-medium text-gray-500 dark:text-gray-400 ml-2">{t('admin.prompts.total', { count: prompts.length })}</span></h2>
                <div className="flex items-center space-x-2">
                    {selectedPrompts.length > 0 && <button onClick={() => setIsBulkDeleteConfirmOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">{t('admin.prompts.deleteSelected', { count: selectedPrompts.length })}</button>}
                    <button onClick={onAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">{t('admin.prompts.addNew')}</button>
                </div>
            </div>

            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); setSelectedPrompts([]); }} className="bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2"><option value="all">All Statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
                <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); setSelectedPrompts([]); }} className="bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2"><option value="All">{t('admin.prompts.allCategories')}</option>{categories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
                <select value={selectedUser} onChange={e => { setSelectedUser(e.target.value); setCurrentPage(1); setSelectedPrompts([]); }} className="bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2"><option value="All">{t('admin.prompts.allUsers')}</option>{users.map(u => <option key={u.uid} value={u.uid}>{u.username}</option>)}<option value="">{t('admin.promptForm.authorAnonymousOption')}</option></select>
                <input type="text" placeholder={t('admin.prompts.searchPlaceholder')} value={promptSearchQuery} onChange={e => { setPromptSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2" />
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 w-4"><input ref={headerCheckboxRef} type="checkbox" onChange={handleToggleSelectAllOnPage} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 rounded" disabled={promptIdsOnPage.length === 0}/></th>
                            <th className="p-3">{t('admin.prompts.promptHeader')}</th>
                            <th className="p-3">{t('admin.prompts.categoriesHeader')}</th>
                            <th className="p-3">{t('admin.prompts.privateHeader')}</th>
                            <th className="p-3">{t('common.status')}</th>
                            <th className="p-3">{t('admin.prompts.authorHeader')}</th>
                            <th className="p-3">Stats</th>
                            <th className="p-3">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedPrompts.map(prompt => {
                            const promptCategories = (prompt.categoryIds || [])
                                .map(id => categories.find(c => c.id === id)?.name)
                                .filter(Boolean)
                                .join(', ');
                            const ratingCount = averageRatings[prompt.id]?.count || 0;
                            const imageUrls = getImageUrls(prompt.imageUrl);
                            const displayImageUrl = imageUrls[0] || '';

                            return (
                                <tr key={prompt.id} className="border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-3"><input type="checkbox" checked={selectedPrompts.includes(prompt.id)} onChange={() => setSelectedPrompts(prev => prev.includes(prompt.id) ? prev.filter(pId => pId !== prompt.id) : [...prev, prompt.id])} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 rounded"/></td>
                                    <td className="p-3 max-w-sm">
                                        <Link to={buildUrl('prompt', { promptId: prompt.id })} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group" title="View Prompt">
                                            <img src={displayImageUrl} alt="" className="h-10 w-10 object-cover rounded-md flex-shrink-0 group-hover:opacity-80 transition-opacity"/>
                                            <span className="truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{prompt.title || prompt.text}</span>
                                        </Link>
                                    </td>
                                    <td className="p-3 text-xs max-w-xs" title={promptCategories}>{promptCategories || '—'}</td>
                                    <td className="p-3 text-center">
                                        {prompt.isPrivate ? (
                                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200" title="Private">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 dark:text-gray-500">—</span>
                                        )}
                                    </td>
                                    <td className="p-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[prompt.status || 'approved']}`}>{prompt.status || 'approved'}</span></td>
                                    <td className="p-3 max-w-xs">{prompt.authorName || '—'}</td>
                                    <td className="p-3">
                                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-1" title="Views">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                <span>{prompt.viewCount || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1" title="Likes/Ratings">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                <span>{ratingCount}</span>
                                            </div>
                                            <div className="flex items-center gap-1" title="Remixes">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684z" /></svg>
                                                <span>{prompt.remixCount || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1" title="Comments">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                <span>{prompt.commentCount || 0}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center space-x-2">
                                            {updatingStatusId === prompt.id ? (<Spinner size="sm" />) : prompt.status === 'pending' ? (
                                                <>
                                                    <button onClick={() => handleStatusUpdate(prompt, 'approved')} className="text-green-600 dark:text-green-400 hover:underline text-sm font-medium">Approve</button>
                                                    <button onClick={() => handleStatusUpdate(prompt, 'rejected')} className="text-yellow-600 dark:text-yellow-400 hover:underline text-sm font-medium">Reject</button>
                                                </>
                                            ) : null}
                                            <button onClick={() => onEdit(prompt)} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">{t('common.edit')}</button>
                                            <button onClick={() => onDelete(prompt.id)} className="text-red-600 dark:text-red-400 hover:underline text-sm font-medium">{t('common.delete')}</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
        </div>
    );
};

export default AdminPrompts;
