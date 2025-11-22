
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import DateFilter from '../DateFilter';
import SortControl from '../SortControl';
import { GetPromptsParams } from '../../services/externalApi';
import { formatCount } from '../../utils/formatters';

interface MobileFilterPanelProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDateFilter: string;
    onSelectDateFilter: (filter: string) => void;
    sortBy: string;
    onSortChange: (option: GetPromptsParams['sortBy']) => void;
    commentFilter: string;
    setCommentFilter: (val: any) => void;
    remixFilter: string;
    setRemixFilter: (val: any) => void;
    referenceImageFilter: string;
    setReferenceImageFilter: (val: any) => void;
    nsfwFilter: string;
    setNsfwFilter: (val: any) => void;
    isAnyFilterActive: boolean;
    handleClearFilters: () => void;
    totalPrompts: number;
}

const FilterSelect: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children: React.ReactNode}> = ({label, value, onChange, children}) => (
    <div className="flex items-center gap-2">
      <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 shrink-0">{label}</label>
      <select value={value} onChange={onChange} className="w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600 transition-colors">
        {children}
      </select>
    </div>
);

const MobileFilterPanel: React.FC<MobileFilterPanelProps> = ({
    isOpen, onClose, selectedDateFilter, onSelectDateFilter, sortBy, onSortChange,
    commentFilter, setCommentFilter, remixFilter, setRemixFilter, referenceImageFilter, setReferenceImageFilter,
    nsfwFilter, setNsfwFilter,
    isAnyFilterActive, handleClearFilters, totalPrompts
}) => {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 lg:hidden" onClick={onClose}>
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl p-6 shadow-2xl animate-slide-up max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 flex-shrink-0"><h3 className="text-xl font-bold">Filters</h3><button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <div className="space-y-6 overflow-y-auto pb-4">
              <div><h4 className="font-semibold mb-2 text-gray-600 dark:text-gray-400">Date</h4><DateFilter selectedFilter={selectedDateFilter} onSelectFilter={onSelectDateFilter} /></div>
              <div><h4 className="font-semibold mb-2 text-gray-600 dark:text-gray-400">Sort By</h4><SortControl sortBy={sortBy as any} onSortChange={onSortChange} /></div>
              <FilterSelect label={`${t('filters.comments')}:`} value={commentFilter} onChange={e => setCommentFilter(e.target.value as any)}><option value="any">{t('filters.any')}</option><option value="yes">{t('filters.hasComments')}</option><option value="no">{t('filters.noComments')}</option></FilterSelect>
              <FilterSelect label={`${t('filters.remixes')}:`} value={remixFilter} onChange={e => setRemixFilter(e.target.value as any)}><option value="any">{t('filters.any')}</option><option value="yes">{t('filters.hasBeenRemixed')}</option><option value="no">{t('filters.notRemixed')}</option></FilterSelect>
              <FilterSelect label={`${t('filters.referenceImage')}:`} value={referenceImageFilter} onChange={e => setReferenceImageFilter(e.target.value as any)}><option value="any">{t('filters.any')}</option><option value="yes">{t('filters.hasReferenceImage')}</option><option value="no">{t('filters.noReferenceImage')}</option></FilterSelect>
              <FilterSelect label="NSFW:" value={nsfwFilter} onChange={e => setNsfwFilter(e.target.value as any)}><option value="any">{t('filters.any')}</option><option value="yes">Show NSFW</option><option value="no">Hide NSFW</option></FilterSelect>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-between">
                {isAnyFilterActive && (
                    <button onClick={() => { handleClearFilters(); onClose(); }} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                        {t('home.clearFilters')}
                    </button>
                )}
                <button onClick={onClose} className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition-colors">
                    {t('home.resultsCount', { count: formatCount(totalPrompts) })}
                </button>
            </div>
          </div>
        </div>
    );
};

export default MobileFilterPanel;
