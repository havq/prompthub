import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShowcaseImage, Prompt } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import Pagination from '../Pagination';
import Spinner from '../Spinner';
import { deleteShowcaseImage as apiDeleteShowcaseImage } from '../../services/api';
import ConfirmModal from '../ConfirmModal';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import { buildUrl } from '../../utils/permalinks';

interface AdminShowcaseProps {
    showcaseImages: ShowcaseImage[];
    prompts: Prompt[]; // To show prompt text
    onDelete: (image: ShowcaseImage) => void;
    onRefresh: () => void;
}

const IMAGES_PER_PAGE = 15;

const AdminShowcase: React.FC<AdminShowcaseProps> = ({ showcaseImages, prompts, onDelete, onRefresh }) => {
    const { t } = useLanguage();
    
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    
    const promptsMap = useMemo(() => new Map(prompts.map(p => [p.id, p])), [prompts]);

    const filteredImages = useMemo(() => {
        let tempImages = showcaseImages;
        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.trim().toLowerCase();
            tempImages = tempImages.filter(img =>
                img.username.toLowerCase().includes(lowercasedQuery) ||
                (promptsMap.get(String(img.promptId))?.text || '').toLowerCase().includes(lowercasedQuery)
            );
        }
        return [...tempImages].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [showcaseImages, searchQuery, promptsMap]);

    const paginatedImages = useMemo(() => {
        const startIndex = (currentPage - 1) * IMAGES_PER_PAGE;
        return filteredImages.slice(startIndex, startIndex + IMAGES_PER_PAGE);
    }, [filteredImages, currentPage]);

    const totalPages = Math.ceil(filteredImages.length / IMAGES_PER_PAGE);

    useEffect(() => {
        const newTotalPages = Math.ceil(filteredImages.length / IMAGES_PER_PAGE);
        if (newTotalPages > 0 && currentPage > newTotalPages) setCurrentPage(newTotalPages);
        else if (newTotalPages === 0 && currentPage > 1) setCurrentPage(1);
    }, [filteredImages, currentPage]);

    const handleToggleSelectAllOnPage = () => {
        const imageIdsOnPage = paginatedImages.map(r => r.id);
        const allSelectedOnPage = imageIdsOnPage.every(id => selectedImages.includes(id));
        setSelectedImages(allSelectedOnPage
            ? prev => prev.filter(id => !imageIdsOnPage.includes(id))
            : [...new Set([...selectedImages, ...imageIdsOnPage])]
        );
    };

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true);
        try {
            const imagesToDelete = showcaseImages.filter(img => selectedImages.includes(img.id));
            await Promise.all(imagesToDelete.map(img => apiDeleteShowcaseImage(img.id, img.userId)));
            setSelectedImages([]);
            onRefresh();
        } catch (error) {
            console.error("Failed to bulk delete showcase images:", error);
            alert("An error occurred during bulk deletion.");
        } finally {
            setIsBulkDeleting(false);
            setIsBulkDeleteConfirmOpen(false);
        }
    };

    const headerCheckboxRef = useRef<HTMLInputElement>(null);
    const imageIdsOnPage = useMemo(() => paginatedImages.map(p => p.id), [paginatedImages]);
    const selectedOnPageCount = useMemo(() => imageIdsOnPage.filter(id => selectedImages.includes(id)).length, [imageIdsOnPage, selectedImages]);

    useEffect(() => {
        if (headerCheckboxRef.current) {
            headerCheckboxRef.current.checked = selectedOnPageCount > 0 && selectedOnPageCount === imageIdsOnPage.length;
            headerCheckboxRef.current.indeterminate = selectedOnPageCount > 0 && selectedOnPageCount < imageIdsOnPage.length;
        }
    }, [selectedOnPageCount, imageIdsOnPage.length]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            {isBulkDeleteConfirmOpen && (
                <ConfirmModal
                    isOpen={isBulkDeleteConfirmOpen}
                    onClose={() => setIsBulkDeleteConfirmOpen(false)}
                    onConfirm={handleBulkDelete}
                    title={t('modals.confirmDeleteTitle')}
                    message={t('admin.showcase.deleteBulkConfirm', { count: selectedImages.length })}
                    confirmText={t('common.delete')}
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                    isConfirming={isBulkDeleting}
                />
            )}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{t('admin.showcase.title')}<span className="text-base font-medium text-gray-500 dark:text-gray-400 ml-2">({showcaseImages.length} total)</span></h2>
                {selectedImages.length > 0 && (
                    <button onClick={() => setIsBulkDeleteConfirmOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        {t('admin.prompts.deleteSelected', { count: selectedImages.length })}
                    </button>
                )}
            </div>

            <div className="mb-4">
                <input type="text" placeholder="Search by author or prompt text..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2" />
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 w-4"><input ref={headerCheckboxRef} type="checkbox" onChange={handleToggleSelectAllOnPage} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 rounded" disabled={imageIdsOnPage.length === 0}/></th>
                            <th className="p-3">Image</th>
                            <th className="p-3">Author</th>
                            <th className="p-3">Original Prompt</th>
                            <th className="p-3">Created At</th>
                            <th className="p-3">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedImages.map(image => (
                            <tr key={image.id} className="border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3"><input type="checkbox" checked={selectedImages.includes(image.id)} onChange={() => setSelectedImages(prev => prev.includes(image.id) ? prev.filter(rId => rId !== image.id) : [...prev, image.id])} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 rounded"/></td>
                                <td className="p-3">
                                    <img src={transformCloudinaryUrl(image.imageUrl, 'w_100,h_100,c_fill')} alt="Showcase" className="h-16 w-16 object-cover rounded-md bg-black" />
                                </td>
                                <td className="p-3">{image.username}</td>
                                <td className="p-3 max-w-sm truncate">
                                    {promptsMap.has(String(image.promptId)) ? (
                                        <Link
                                            to={buildUrl('prompt', { promptId: image.promptId })}
                                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                                            title={promptsMap.get(String(image.promptId))?.text}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {promptsMap.get(String(image.promptId))?.text || 'View Prompt'}
                                        </Link>
                                    ) : (
                                        <span className="text-gray-500 italic">Prompt not found</span>
                                    )}
                                </td>
                                <td className="p-3 text-sm">{new Date(image.createdAt).toLocaleDateString()}</td>
                                <td className="p-3">
                                    <button onClick={() => onDelete(image)} className="text-red-600 dark:text-red-400 hover:underline text-sm font-medium">{t('common.delete')}</button>
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

export default AdminShowcase;