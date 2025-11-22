import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface DateFilterProps {
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ selectedFilter, onSelectFilter }) => {
  const { t } = useLanguage();

  const dateOptions = [
    { key: 'all', label: t('filters.allTime') },
    { key: '24h', label: t('filters.last24h') },
    { key: '7d', label: t('filters.last7d') },
    { key: '30d', label: t('filters.last30d') },
  ];

  return (
    <div className="flex items-center flex-wrap gap-2">
      {dateOptions.map(option => (
        <button
          key={option.key}
          onClick={() => onSelectFilter(option.key)}
          className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-300 ${
            selectedFilter === option.key
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-transparent'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default DateFilter;