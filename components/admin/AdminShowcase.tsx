


import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShowcaseImage } from '../../utils/types';
import { useLanguage } from '../../context/LanguageContext';
import Pagination from '../Pagination';
import Spinner from '../Spinner';
import { getAdminShowcaseImages, deleteShowcaseImage as apiDeleteShowcaseImage } from '../../services/api';
import ConfirmModal from '../ConfirmModal';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import { buildUrl } from '../../utils/permalinks';
import { useDebounce } from '../../hooks/useDebounce';

const IMAGES_PER_PAGE = 15;

const AdminShowcase: React.FC = () => {
    const { t } = useLanguage();
    
    const [showcaseImages, setShowcaseImages] = useState<ShowcaseImage[]>([]);
    const [totalImages, setTotalImages] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [deletingImage, setDeletingImage] = useState<ShowcaseImage | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchImages = useCallback(async () => {
        setIsLoading(true);
        try {
            const { images, total } = await getAdminShowcaseImages(currentPage, IMAGES_PER_PAGE, debouncedSearchQuery);
            setShowcaseImages(images);
            setTotalImages(total);
        } catch (error) {
            console.error("Failed to fetch showcase images:", error);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, debouncedSearchQuery]);

    useEffect(() => {
        fetchImages();
    }, [fetchImages]);

    // Reset page when searching
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery]);

    const totalPages = Math.ceil(totalImages / IMAGES_PER_PAGE);

    const handleToggleSelectAllOnPage = () => {
        const imageIdsOnPage = showcaseImages.map(r => r.id);
        const allSelectedOnPage = imageIdsOnPage.every(id => selectedImages.includes(id));
        setSelectedImages(allSelectedOnPage
            ? prev => prev.filter(id => !imageIdsOnPage.includes(id))
            : [...new Set([...selectedImages, ...imageIdsOnPage])]
        );
    };

    const handleDeleteClick = (image: ShowcaseImage) => {
        setDeletingImage(image);
    };

    const handleConfirmDelete = async () => {
        if (!deletingImage) return;
        setIsDeleting(true);
        try {
            await apiDeleteShowcaseImage(deletingImage.id, deletingImage.userId);
            setDeletingImage(null);
            fetchImages(); // Refresh list
        } catch (error) {
            console.error("Failed to delete showcase image:", error);
            alert("Failed to delete image.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true);
        try {
            // We need userId for deletion API, find it from current page data or we might need a bulk delete API that takes only IDs
            // Current API: deleteShowcaseImage(id, userId).
            // Admin bulk delete usually bypasses userId check or we need to supply it.
            // Let's map IDs to objects from current view. 
            // Note: If selecting across pages is supported later, this logic needs update.
            // For now, only items on current page are selectable easily.
            
            const imagesToDelete = showcaseImages.filter(img => selectedImages.includes(img.id));
            
            // If there are selected IDs not in current view (unlikely with current UI but possible), they won't be deleted here.
            // Improve: Send only IDs to a new bulk delete endpoint, OR loop.
            
            await Promise.all(imagesToDelete.map(img => apiDeleteShowcaseImage(img.id, img.userId)));
            setSelectedImages([]);
            fetchImages();
        } catch (error) {
            console.error("Failed to bulk delete showcase images:", error);
            alert("An error occurred during bulk deletion.");
        } finally {
            setIsBulkDeleting(false);
            setIsBulkDeleteConfirmOpen(false);
        }
    };

    const headerCheckboxRef = useRef<HTMLInputElement>(null);
    const selectedOnPageCount = useMemo(() => showcaseImages.filter(img => selectedImages.includes(img.id)).length, [showcaseImages, selectedImages]);

    useEffect(() => {
        if (headerCheckboxRef.current) {
            headerCheckboxRef.current.checked = showcaseImages.length > 0 && selectedOnPageCount === showcaseImages.length;
            headerCheckboxRef.current.indeterminate = selectedOnPageCount > 0 && selectedOnPageCount < showcaseImages.length;
        }
    }, [selectedOnPageCount, showcaseImages.length]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            {deletingImage && (
                <ConfirmModal
                    isOpen={!!deletingImage}
                    onClose={() => setDeletingImage(null)}
                    onConfirm={handleConfirmDelete}
                    title={t('admin.showcase.title')}
                    message={t('admin.showcase.deleteConfirm', { username: deletingImage.username })}
                    confirmText={t('common.delete')}
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                    isConfirming={isDeleting}
                />
            )}

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
                <h2 className="text-2xl font-bold">{t('admin.showcase.title')}<span className="text-base font-medium text-gray-500 dark:text-gray-400 ml-2">({totalImages} total)</span></h2>
                {selectedImages.length > 0 && (
                    <button onClick={() => setIsBulkDeleteConfirmOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        {t('admin.prompts.deleteSelected', { count: selectedImages.length })}
                    </button>
                )}
            </div>

            <div className="mb-4">
                <input type="text" placeholder="Search by author or prompt text..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2" />
            </div>
            
            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : (
                <>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="p-3 w-4"><input ref={headerCheckboxRef} type="checkbox" onChange={handleToggleSelectAllOnPage} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 rounded" disabled={showcaseImages.length === 0}/></th>
                                <th className="p-3">Image</th>
                                <th className="p-3">Author</th>
                                <th className="p-3">Original Prompt</th>
                                <th className="p-3">Created At</th>
                                <th className="p-3">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {showcaseImages.length > 0 ? showcaseImages.map(image => (
                                <tr key={image.id} className="border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-3"><input type="checkbox" checked={selectedImages.includes(image.id)} onChange={() => setSelectedImages(prev => prev.includes(image.id) ? prev.filter(rId => rId !== image.id) : [...prev, image.id])} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 rounded"/></td>
                                    <td className="p-3">
                                        <img src={transformCloudinaryUrl(image.imageUrl, 'w_100,h_100,c_fill')} alt="Showcase" className="h-16 w-16 object-cover rounded-md bg-black" />
                                    </td>
                                    <td className="p-3">{image.username}</td>
                                    <td className="p-3 max-w-sm truncate">
                                        {/* Use optional chaining for promptText since it might be missing on older data or join fail */}
                                        {image.promptText ? (
                                            <Link
                                                to={buildUrl('prompt', { promptId: image.promptId })}
                                                className="text-indigo-600 dark:text-indigo-400 hover:underline"
                                                title={image.promptText}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {image.promptText}
                                            </Link>
                                        ) : (
                                            <span className="text-gray-500 italic">Prompt deleted or not found</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-sm">{new Date(image.createdAt).toLocaleDateString()}</td>
                                    <td className="p-3">
                                        <button onClick={() => handleDeleteClick(image)} className="text-red-600 dark:text-red-400 hover:underline text-sm font-medium">{t('common.delete')}</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="text-center p-8 text-gray-500 dark:text-gray-400">No showcase images found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
                </>
            )}
        </div>
    );
};

export default AdminShowcase;