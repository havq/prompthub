import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface TagFilterProps {
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

const TagFilter: React.FC<TagFilterProps> = ({ tags, selectedTag, onSelectTag }) => {
  const { t } = useLanguage();
  return (
    <div className="flex items-center flex-wrap gap-2">
      <button
        onClick={() => onSelectTag(null)}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-300 ${
          selectedTag === null
            ? 'bg-indigo-600 text-white shadow-md'
            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-transparent'
        }`}
      >
        {t('common.all')}
      </button>
      {tags.map(tag => (
        <button
          key={tag}
          onClick={() => onSelectTag(tag)}
          className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-300 ${
            selectedTag === tag
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-transparent'
          }`}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
};

export default TagFilter;