import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Reel } from '../../utils/types';
import { useLanguage } from '../../context/LanguageContext';
import Pagination from '../Pagination';
import Spinner from '../Spinner';
import { deleteReel as apiDeleteReel } from '../../services/api';
import ConfirmModal from '../ConfirmModal';
import { buildUrl } from '../../utils/permalinks';

interface AdminReelsProps {
    reels: Reel[];
    onAdd: () => void;
    onEdit: (reel: Reel) => void;
    onDelete: (id: string) => void;
    onRefresh: () => void;
}

const REELS_PER_PAGE = 12;

const AdminReels: React.FC<AdminReelsProps> = ({ reels, onAdd, onEdit, onDelete, onRefresh }) => {
    const { t } = useLanguage();
    
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [selectedReels, setSelectedReels] = useState<string[]>([]);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    
    const filteredReels = useMemo(() => {
        let tempReels = reels;
        if (statusFilter !== 'all') {
            tempReels = tempReels.filter(r => (r.status || 'approved') === statusFilter);
        }
        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.trim().toLowerCase();
            tempReels = tempReels.filter(r =>
                r.title.toLowerCase().includes(lowercasedQuery) ||
                (r.authorName && r.authorName.toLowerCase().includes(lowercasedQuery)) ||
                r.tags?.some(tag => tag.toLowerCase().includes(lowercasedQuery))
            );
        }
        return tempReels;
    }, [reels, statusFilter, searchQuery]);

    const paginatedReels = useMemo(() => {
        const startIndex = (currentPage - 1) * REELS_PER_PAGE;
        return filteredReels.slice(startIndex, startIndex + REELS_PER_PAGE);
    }, [filteredReels, currentPage]);

    const totalPages = Math.ceil(filteredReels.length / REELS_PER_PAGE);

    useEffect(() => {
        const newTotalPages = Math.ceil(filteredReels.length / REELS_PER_PAGE);
        if (newTotalPages > 0 && currentPage > newTotalPages) setCurrentPage(newTotalPages);
        else if (newTotalPages === 0 && currentPage > 1) setCurrentPage(1);
    }, [filteredReels, currentPage]);

    const handleToggleSelectAllOnPage = () => {
        const reelIdsOnPage = paginatedReels.map(r => r.id);
        const allSelectedOnPage = reelIdsOnPage.every(id => selectedReels.includes(id));
        setSelectedReels(allSelectedOnPage
            ? prev => prev.filter(id => !reelIdsOnPage.includes(id))
            : [...new Set([...selectedReels, ...reelIdsOnPage])]
        );
    };

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true);
        try {
            await Promise.all(selectedReels.map(id => apiDeleteReel(id)));
            setSelectedReels([]);
            onRefresh();
        } catch (error) {
            console.error("Failed to bulk delete reels:", error);
            alert("An error occurred during bulk deletion.");
        } finally {
            setIsBulkDeleting(false);
            setIsBulkDeleteConfirmOpen(false);
        }
    };

    const headerCheckboxRef = useRef<HTMLInputElement>(null);
    const reelIdsOnPage = useMemo(() => paginatedReels.map(p => p.id), [paginatedReels]);
    const selectedOnPageCount = useMemo(() => reelIdsOnPage.filter(id => selectedReels.includes(id)).length, [reelIdsOnPage, selectedReels]);

    useEffect(() => {
        if (headerCheckboxRef.current) {
            headerCheckboxRef.current.checked = selectedOnPageCount > 0 && selectedOnPageCount === reelIdsOnPage.length;
            headerCheckboxRef.current.indeterminate = selectedOnPageCount > 0 && selectedOnPageCount < reelIdsOnPage.length;
        }
    }, [selectedOnPageCount, reelIdsOnPage.length]);

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
                    message={t('admin.reels.deleteBulkConfirm', { count: selectedReels.length })}
                    confirmText={t('common.delete')}
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                    isConfirming={isBulkDeleting}
                />
            )}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{t('admin.reels.title')}<span className="text-base font-medium text-gray-500 dark:text-gray-400 ml-2">({reels.length} total)</span></h2>
                <div className="flex items-center space-x-2">
                    {selectedReels.length > 0 && <button onClick={() => setIsBulkDeleteConfirmOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">{t('admin.prompts.deleteSelected', { count: selectedReels.length })}</button>}
                    <button onClick={onAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">{t('admin.reels.addNew')}</button>
                </div>
            </div>

            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); setSelectedReels([]); }} className="bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2">
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
                <input type="text" placeholder="Search by title, tag, or author..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2 col-span-2" />
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 w-4"><input ref={headerCheckboxRef} type="checkbox" onChange={handleToggleSelectAllOnPage} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 rounded" disabled={reelIdsOnPage.length === 0}/></th>
                            <th className="p-3">Video</th>
                            <th className="p-3">Title</th>
                            <th className="p-3">Author</th>
                            <th className="p-3">Stats</th>
                            <th className="p-3">NSFW</th>
                            <th className="p-3">{t('common.status')}</th>
                            <th className="p-3">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedReels.map(reel => (
                            <tr key={reel.id} className="border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3"><input type="checkbox" checked={selectedReels.includes(reel.id)} onChange={() => setSelectedReels(prev => prev.includes(reel.id) ? prev.filter(rId => rId !== reel.id) : [...prev, reel.id])} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 rounded"/></td>
                                <td className="p-3">
                                    <Link to={buildUrl('reel', { reelId: reel.id })} target="_blank" rel="noopener noreferrer" title="Open Reel Player">
                                        <video src={reel.videoUrl} className="h-16 w-10 object-cover rounded-md bg-black hover:opacity-80 transition-opacity cursor-pointer" />
                                    </Link>
                                </td>
                                <td className="p-3 max-w-sm truncate" title={reel.title}>{reel.title}</td>
                                <td className="p-3">{reel.authorName || '—'}</td>
                                <td className="p-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="flex items-center gap-1" title="Likes">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                                            {reel.likeCount || 0}
                                        </div>
                                        <div className="flex items-center gap-1" title="Views">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            {reel.viewCount || 0}
                                        </div>
                                        <div className="flex items-center gap-1" title="Comments">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                            {reel.commentCount || 0}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3">
                                    {reel.isNSFW ? (
                                        <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                                            NSFW
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800">
                                            Safe
                                        </span>
                                    )}
                                </td>
                                <td className="p-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[reel.status || 'approved']}`}>{reel.status || 'approved'}</span></td>
                                <td className="p-3">
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => onEdit(reel)} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">{t('common.edit')}</button>
                                        <button onClick={() => onDelete(reel.id)} className="text-red-600 dark:text-red-400 hover:underline text-sm font-medium">{t('common.delete')}</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
        </div>
    );
};

export default AdminReels;