
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import DateFilter from '../DateFilter';
import SortControl from '../SortControl';
import { GetPromptsParams } from '../../services/externalApi';

interface HomeHeaderProps {
    searchInput: string;
    handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setIsFilterPanelOpen: (isOpen: boolean) => void;
    showAIPromptIdeasButton: boolean;
    handleAIGeneratorClick: () => void;
    handleSubmitPromptClick: () => void;
    selectedDateFilter: string;
    handleSelectDateFilter: (filter: string) => void;
    sortBy: string;
    handleSortChange: (option: GetPromptsParams['sortBy']) => void;
    isAnyFilterActive: boolean;
    handleClearFilters: () => void;
    commentFilter: string;
    setCommentFilter: (val: any) => void;
    remixFilter: string;
    setRemixFilter: (val: any) => void;
    referenceImageFilter: string;
    setReferenceImageFilter: (val: any) => void;
    nsfwFilter: string;
    setNsfwFilter: (val: any) => void;
    allTags: string[];
    selectedTag: string | null;
    handleSelectTag: (tag: string | null) => void;
    isTagsExpanded: boolean;
    setIsTagsExpanded: (val: boolean) => void;
    TAGS_TO_SHOW_INITIAL: number;
}

const FilterSelect: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children: React.ReactNode}> = ({label, value, onChange, children}) => (
    <div className="flex items-center gap-2">
      <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 shrink-0">{label}</label>
      <select value={value} onChange={onChange} className="w-full bg-white dark:bg-[#1c1f26] text-gray-800 dark:text-gray-300 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-800 transition-colors">
        {children}
      </select>
    </div>
);

const HomeHeader: React.FC<HomeHeaderProps> = ({
    searchInput, handleSearchChange, setIsFilterPanelOpen,
    handleSubmitPromptClick, selectedDateFilter, handleSelectDateFilter,
    sortBy, handleSortChange, isAnyFilterActive, handleClearFilters,
    commentFilter, setCommentFilter, remixFilter, setRemixFilter, referenceImageFilter, setReferenceImageFilter,
    nsfwFilter, setNsfwFilter,
    allTags, selectedTag, handleSelectTag, isTagsExpanded, setIsTagsExpanded, TAGS_TO_SHOW_INITIAL
}) => {
    const { t } = useLanguage();
    
    const tagsToDisplay = isTagsExpanded ? allTags : allTags.slice(0, TAGS_TO_SHOW_INITIAL);

    return (
        <div className="py-4">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                    {t('home.title')}
                </h1>
                <p className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                    {t('home.subtitle')}
                </p>
            </div>

            <div className="flex flex-col gap-3">
                {/* Mobile Layout: Search & Filter Icon in one row, Action buttons in next */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex gap-2 flex-grow">
                        <input 
                            type="text" 
                            value={searchInput} 
                            onChange={handleSearchChange} 
                            placeholder={t('home.searchPlaceholder')} 
                            className="w-full flex-grow bg-white dark:bg-[#1c1f26] text-gray-900 dark:text-white rounded-lg px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-800 placeholder-gray-500 dark:placeholder-gray-500" 
                        />
                        <button 
                            onClick={() => setIsFilterPanelOpen(true)} 
                            className="sm:hidden flex-shrink-0 flex items-center justify-center px-4 rounded-lg bg-white dark:bg-[#1c1f26] border border-gray-300 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" 
                            aria-label={t('home.filters')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:flex items-center sm:justify-end gap-2 w-full sm:w-auto">
                        {/* Desktop Filter Button */}
                        <button onClick={() => setIsFilterPanelOpen(true)} className="hidden sm:flex lg:hidden items-center justify-center px-3 py-2.5 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-[#1c1f26] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-800">
                            {t('home.filters')}
                        </button>
                    </div>
                </div>

                {/* Desktop Filters Row */}
                <div className="hidden lg:flex flex-wrap items-center gap-x-6 gap-y-3 justify-center">
                    <DateFilter selectedFilter={selectedDateFilter} onSelectFilter={handleSelectDateFilter} />
                    <SortControl sortBy={sortBy as any} onSortChange={handleSortChange} />
                    {isAnyFilterActive && <button onClick={handleClearFilters} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{t('home.clearFilters')}</button>}
                </div>

                {/* Advanced Filters Row */}
                <div className="hidden lg:flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                    <FilterSelect label={`${t('filters.comments')}:`} value={commentFilter} onChange={e => setCommentFilter(e.target.value as any)}><option value="any">{t('filters.any')}</option><option value="yes">{t('filters.hasComments')}</option><option value="no">{t('filters.noComments')}</option></FilterSelect>
                    <FilterSelect label={`${t('filters.remixes')}:`} value={remixFilter} onChange={e => setRemixFilter(e.target.value as any)}><option value="any">{t('filters.any')}</option><option value="yes">{t('filters.hasBeenRemixed')}</option><option value="no">{t('filters.notRemixed')}</option></FilterSelect>
                    <FilterSelect label={`${t('filters.referenceImage')}:`} value={referenceImageFilter} onChange={e => setReferenceImageFilter(e.target.value as any)}><option value="any">{t('filters.any')}</option><option value="yes">{t('filters.hasReferenceImage')}</option><option value="no">{t('filters.noReferenceImage')}</option></FilterSelect>
                    <FilterSelect label="NSFW:" value={nsfwFilter} onChange={e => setNsfwFilter(e.target.value as any)}><option value="any">{t('filters.any')}</option><option value="yes">Show NSFW</option><option value="no">Hide NSFW</option></FilterSelect>
                </div>
            </div>
            
            {/* Tag Cloud */}
            {allTags.length > 0 && (
                <div className="flex justify-center mt-4">
                    <div className="flex items-center flex-wrap gap-2 justify-center max-w-4xl mx-auto">
                        <button onClick={() => handleSelectTag(null)} className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-300 ${ selectedTag === null ? 'bg-indigo-600 text-white shadow-md border border-indigo-600' : 'bg-white dark:bg-[#1c1f26] text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-800' }`}>{t('common.all')}</button>
                        {tagsToDisplay.map((tag) => <button key={tag} onClick={() => handleSelectTag(tag)} className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-300 ${ selectedTag === tag ? 'bg-indigo-600 text-white shadow-md border border-indigo-600' : 'bg-white dark:bg-[#1c1f26] text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-800' }`}>#{tag}</button>)}
                        {allTags.length > TAGS_TO_SHOW_INITIAL && (<button onClick={() => setIsTagsExpanded(!isTagsExpanded)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{isTagsExpanded ? t('common.showLess') : t('common.showMore', { count: allTags.length - TAGS_TO_SHOW_INITIAL })}</button>)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeHeader;
