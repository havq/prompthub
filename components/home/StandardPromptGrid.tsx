import React, { useRef, useEffect } from 'react';
import { Prompt } from '../../utils/types';
import { useLanguage } from '../../context/LanguageContext';
import { useHomeLogic } from '../../hooks/useHomeLogic';
import PromptCard from '../PromptCard';
import PromptCardSkeleton from '../PromptCardSkeleton';
import Pagination from '../Pagination';
import Spinner from '../Spinner';
import { buildUrl } from '../../utils/permalinks';
import { useNavigate } from 'react-router-dom';

interface StandardPromptGridProps {
    logic: ReturnType<typeof useHomeLogic>;
    handlePageChange: (page: number) => void;
    handleCategorySelect: (categoryId: string | 'All') => void;
    handleSelectTag: (tag: string | null) => void;
    isAnyFilterActive: boolean;
    handleClearFilters: () => void;
    handleFindSimilar: (prompt: Prompt) => void;
    handleAuthAction: (action: () => void) => void;
    handleOpenPromptDetail: (prompt: Prompt) => void;
    setReportingPrompt: (p: Prompt | null) => void;
    setPromptToRemix: (p: Prompt | null) => void;
    setPromptForCollections: (p: Prompt | null) => void;
    setPromptForShowcase: (p: Prompt | null) => void;
    setSelectedPrompt: (p: Prompt | null) => void;
    setSourcePromptForModal: (p: Prompt | null) => void;
    setEditingPrompt: (p: Prompt | null) => void;
    setDeletingPrompt: (p: Prompt | null) => void;
    promptListRef: React.RefObject<HTMLDivElement>;
}

const StandardPromptGrid: React.FC<StandardPromptGridProps> = (props) => {
    const {
        logic, handlePageChange, handleCategorySelect, handleSelectTag, isAnyFilterActive, handleClearFilters,
        handleFindSimilar, handleAuthAction, handleOpenPromptDetail, setReportingPrompt, setPromptToRemix,
        setPromptForCollections, setPromptForShowcase, setSelectedPrompt, setSourcePromptForModal,
        setEditingPrompt, setDeletingPrompt, promptListRef
    } = props;

    const { t } = useLanguage();
    const loaderRef = useRef<HTMLDivElement>(null);

    const containerClasses = {
        grid: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6',
        list: 'flex flex-col space-y-4',
        compact: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2',
    };

    // Infinite Scroll Observer
    useEffect(() => {
        if (logic.paginationStyle !== 'infiniteScroll' || logic.isLoading || !logic.hasMore) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    logic.setCurrentPage(prev => prev + 1);
                }
            },
            { rootMargin: '200px' }
        );
        const currentLoader = loaderRef.current;
        if (currentLoader) observer.observe(currentLoader);
        return () => { if (currentLoader) observer.unobserve(currentLoader); };
    }, [logic.isLoading, logic.hasMore, logic.paginationStyle, logic.setCurrentPage]);

    return (
        <div ref={promptListRef}>
            {(logic.isLoading && logic.prompts.length === 0) ? (
                <div className={containerClasses[logic.viewMode]}>
                    {Array.from({ length: logic.settings.promptDisplayCount }).map((_, index) => <PromptCardSkeleton key={index} viewMode={logic.viewMode} />)}
                </div>
            ) : logic.prompts.length > 0 ? (
                <>
                    <div className={containerClasses[logic.viewMode]}>
                        {logic.prompts.map(prompt => {
                            const avgRatingData = logic.averageRatings[prompt.id] || { average: 0, count: 0 };
                            const canManage = logic.isAdmin || (logic.currentUser && prompt.authorId === logic.currentUser.uid);
                            return (
                                <PromptCard 
                                    key={prompt.id} prompt={prompt} viewMode={logic.viewMode} categories={logic.categories} 
                                    onFindSimilar={handleFindSimilar} onTagClick={handleSelectTag} onCategoryClick={handleCategorySelect} 
                                    userRating={logic.ratings[prompt.id] || 0} onRate={(p, r) => handleAuthAction(() => logic.handleRatePrompt(p, r, () => {}))}
                                    isFavorite={logic.favorites.has(prompt.id)} onToggleFavorite={logic.handleToggleFavorite} 
                                    averageRating={avgRatingData.average} ratingCount={avgRatingData.count} 
                                    commentCount={logic.commentCounts[prompt.id] || 0} showcaseCount={logic.showcaseCounts[prompt.id] || 0} viewCount={prompt.viewCount || 0} 
                                    onClick={() => handleOpenPromptDetail(prompt)} onReport={setReportingPrompt} 
                                    onRemix={(p) => handleAuthAction(() => setPromptToRemix(p))} 
                                    onAddToCollection={(p) => handleAuthAction(() => setPromptForCollections(p))} 
                                    onUploadShowcase={(p) => handleAuthAction(() => setPromptForShowcase(p))} 
                                    onEdit={(p) => { setSelectedPrompt(null); setSourcePromptForModal(null); setEditingPrompt(p); }} 
                                    onDelete={setDeletingPrompt} canManage={canManage} 
                                />
                            );
                        })}
                    </div>
                    {logic.paginationStyle === 'pagination' && logic.totalPages > 1 && (<Pagination currentPage={logic.currentPage} totalPages={logic.totalPages} onPageChange={handlePageChange} />)}
                    {logic.paginationStyle === 'infiniteScroll' && logic.hasMore && (<div ref={loaderRef} className="flex justify-center py-8">{logic.isLoading && <Spinner size="md" />}</div>)}
                    {logic.paginationStyle === 'infiniteScroll' && !logic.hasMore && logic.prompts.length >= logic.settings.promptDisplayCount && (<p className="text-center text-gray-500 dark:text-gray-400 py-8">{t('home.endOfResults')}</p>)}
                </>
            ) : (
                <div className="text-center py-16 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg">
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">{t('home.noPromptsFound')}</h2>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">{t('home.noPromptsMessage')}</p>
                    {isAnyFilterActive && (<button onClick={handleClearFilters} className="mt-4 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{t('home.clearFilters')}</button>)}
                </div>
            )}
        </div>
    );
};

export default StandardPromptGrid;
