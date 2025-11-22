import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Post, Category, UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { deletePost as apiDeletePost, updatePost } from '../../services/api';
import ConfirmModal from '../ConfirmModal';
import Pagination from '../Pagination';
import Spinner from '../Spinner';
import { buildUrl } from '../../utils/permalinks';

interface AdminPostsProps {
    posts: Post[];
    categories: Category[];
    users: UserProfile[];
    onAdd: () => void;
    onEdit: (post: Post) => void;
    onDelete: (id: string) => void;
    onRefresh: () => void;
}

const POSTS_PER_PAGE = 12;

const AdminPosts: React.FC<AdminPostsProps> = ({ posts, categories, users, onAdd, onEdit, onDelete, onRefresh }) => {
    const { t } = useLanguage();
    
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'pending' | 'private' | 'draft'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
    const [updatingCommentStatusId, setUpdatingCommentStatusId] = useState<string | null>(null);

    const filteredPosts = useMemo(() => {
        let tempPosts = posts;
        if (statusFilter !== 'all') {
            tempPosts = tempPosts.filter(p => (p.status || 'published') === statusFilter);
        }
        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.trim().toLowerCase();
            tempPosts = tempPosts.filter(p =>
                p.title.toLowerCase().includes(lowercasedQuery) ||
                (p.authorName && p.authorName.toLowerCase().includes(lowercasedQuery)) ||
                p.tags?.some(tag => tag.toLowerCase().includes(lowercasedQuery))
            );
        }
        return [...tempPosts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [posts, statusFilter, searchQuery]);
  
    const paginatedPosts = useMemo(() => {
        const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
        return filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
    }, [filteredPosts, currentPage]);

    const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);

    useEffect(() => {
        const newTotalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
        if (newTotalPages > 0 && currentPage > newTotalPages) setCurrentPage(newTotalPages);
        else if (newTotalPages === 0 && currentPage > 1) setCurrentPage(1);
    }, [filteredPosts, currentPage]);

    const handleToggleSelectAllOnPage = () => {
        const postIdsOnPage = paginatedPosts.map(p => p.id);
        const allSelectedOnPage = postIdsOnPage.every(id => selectedPosts.includes(id));
        setSelectedPosts(allSelectedOnPage
            ? prev => prev.filter(id => !postIdsOnPage.includes(id))
            : [...new Set([...selectedPosts, ...postIdsOnPage])]
        );
    };

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true);
        try {
            await Promise.all(selectedPosts.map(id => apiDeletePost(id)));
            setSelectedPosts([]);
            onRefresh();
        } catch (error) {
            console.error("Failed to bulk delete posts:", error);
            alert("An error occurred during bulk deletion.");
        } finally {
            setIsBulkDeleting(false);
            setIsBulkDeleteConfirmOpen(false);
        }
    };

    const handleStatusUpdate = async (post: Post, status: 'published' | 'pending' | 'private' | 'draft') => {
        setUpdatingStatusId(post.id);
        try {
            await updatePost({ ...post, status });
            onRefresh();
        } catch (error) {
            console.error(`Failed to update post status to ${status}:`, error);
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleToggleCommentsEnabled = async (post: Post) => {
        setUpdatingCommentStatusId(post.id);
        try {
            await updatePost({ ...post, commentsEnabled: !(post.commentsEnabled ?? true) });
            onRefresh();
        } catch(error) {
            console.error("Failed to toggle comments enabled status:", error);
        } finally {
            setUpdatingCommentStatusId(null);
        }
    };

    const headerCheckboxRef = useRef<HTMLInputElement>(null);
    const postIdsOnPage = useMemo(() => paginatedPosts.map(p => p.id), [paginatedPosts]);
    const selectedOnPageCount = useMemo(() => postIdsOnPage.filter(id => selectedPosts.includes(id)).length, [postIdsOnPage, selectedPosts]);

    useEffect(() => {
        if (headerCheckboxRef.current) {
            headerCheckboxRef.current.checked = selectedOnPageCount > 0 && selectedOnPageCount === postIdsOnPage.length;
            headerCheckboxRef.current.indeterminate = selectedOnPageCount > 0 && selectedOnPageCount < postIdsOnPage.length;
        }
    }, [selectedOnPageCount, postIdsOnPage.length]);

    const statusColors: Record<NonNullable<Post['status']>, string> = {
        pending: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
        published: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
        draft: 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200',
        private: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            {isBulkDeleteConfirmOpen && (
                <ConfirmModal
                    isOpen={isBulkDeleteConfirmOpen}
                    onClose={() => setIsBulkDeleteConfirmOpen(false)}
                    onConfirm={handleBulkDelete}
                    title={t('modals.confirmDeleteTitle')}
                    message={t('admin.posts.deleteBulkConfirm', { count: selectedPosts.length })}
                    confirmText={t('common.delete')}
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                    isConfirming={isBulkDeleting}
                />
            )}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{t('admin.posts.title')}<span className="text-base font-medium text-gray-500 dark:text-gray-400 ml-2">({posts.length} total)</span></h2>
                <div className="flex items-center space-x-2">
                    {selectedPosts.length > 0 && <button onClick={() => setIsBulkDeleteConfirmOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">{t('admin.prompts.deleteSelected', { count: selectedPosts.length })}</button>}
                    <button onClick={onAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">{t('admin.posts.addNew')}</button>
                </div>
            </div>

            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); setSelectedPosts([]); }} className="bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2">
                    <option value="all">All Statuses</option>
                    <option value="published">Published</option>
                    <option value="pending">Pending</option>
                    <option value="private">Private</option>
                    <option value="draft">Draft</option>
                </select>
                <input type="text" placeholder="Search by title, tag, or author..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2" />
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 w-4"><input ref={headerCheckboxRef} type="checkbox" onChange={handleToggleSelectAllOnPage} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 rounded" disabled={postIdsOnPage.length === 0}/></th>
                            <th className="p-3">Title</th>
                            <th className="p-3">Author</th>
                            <th className="p-3">Stats</th>
                            <th className="p-3">Comments</th>
                            <th className="p-3">{t('common.status')}</th>
                            <th className="p-3">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedPosts.map(post => {
                            return (
                                <tr key={post.id} className="border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-3"><input type="checkbox" checked={selectedPosts.includes(post.id)} onChange={() => setSelectedPosts(prev => prev.includes(post.id) ? prev.filter(pId => pId !== post.id) : [...prev, post.id])} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 rounded"/></td>
                                    <td className="p-3 max-w-sm">
                                        <Link to={buildUrl('post', { postId: post.id })} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group" title="View Post">
                                            <img src={post.imageUrl} alt="" className="h-10 w-10 object-cover rounded-md flex-shrink-0 group-hover:opacity-80 transition-opacity"/>
                                            <span className="truncate font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{post.title}</span>
                                        </Link>
                                    </td>
                                    <td className="p-3 max-w-xs">{post.authorName || '—'}</td>
                                    <td className="p-3">
                                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-1" title="Views">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                <span>{post.viewCount || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1" title="Comments">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                <span>{post.commentCount || 0}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        {updatingCommentStatusId === post.id ? <Spinner size="sm"/> : (
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={post.commentsEnabled ?? true} onChange={() => handleToggleCommentsEnabled(post)} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        )}
                                    </td>
                                    <td className="p-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[post.status || 'published']}`}>{post.status || 'published'}</span></td>
                                    <td className="p-3">
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => onEdit(post)} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">{t('common.edit')}</button>
                                            <button onClick={() => onDelete(post.id)} className="text-red-600 dark:text-red-400 hover:underline text-sm font-medium">{t('common.delete')}</button>
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

export default AdminPosts;