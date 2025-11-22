import React from 'react';
import { useLanguage } from '../context/LanguageContext';

type SortOption = 'newest' | 'oldest' | 'rating' | 'remixes' | 'comments' | 'votes' | 'views';

interface SortControlProps {
  sortBy: SortOption;
  onSortChange: (option: SortOption) => void;
}

const SortControl: React.FC<SortControlProps> = ({ sortBy, onSortChange }) => {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-by" className="text-sm font-semibold text-gray-500 dark:text-gray-400 shrink-0">{t('filters.sortBy')}</label>
      <select
        id="sort-by"
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600 transition-colors"
        aria-label="Sort prompts by"
      >
        <option value="newest">{t('filters.newest')}</option>
        <option value="oldest">{t('filters.oldest')}</option>
        <option value="rating">{t('filters.highestRating')}</option>
        <option value="votes">{t('filters.mostVotes')}</option>
        <option value="views">{t('filters.mostViewed')}</option>
        <option value="remixes">{t('filters.mostRemixes')}</option>
        <option value="comments">{t('filters.mostComments')}</option>
      </select>
    </div>
  );
};

export default SortControl;