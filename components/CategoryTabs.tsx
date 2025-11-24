
import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { CategoryWithCount, PostCategoryWithCount, ReelCategoryWithCount } from '../utils/types';
import { useLanguage } from '../context/LanguageContext';
import { buildUrl } from '../utils/permalinks';

interface CategoryTabsProps {
  categories: (CategoryWithCount | PostCategoryWithCount | ReelCategoryWithCount)[];
  selectedCategory: string | 'All';
  onSelectCategory: (categoryId: string | 'All') => void;
  totalPrompts: number;
  permalinkType?: 'promptCategory' | 'postCategory' | 'reelCategory';
  basePath?: string;
}

const formatCount = (count: number | undefined): string => {
    const num = Number(count || 0);
    if (num < 1000) {
      return num.toLocaleString();
    }
    const units = ['k', 'm', 'b', 't'];
    const unit = Math.floor((num.toFixed(0).length - 1) / 3) - 1;
    
    if (unit >= units.length) {
        return num.toLocaleString();
    }
    
    const value = num / Math.pow(1000, unit + 1);
    const truncatedValue = Math.floor(value * 10) / 10;
    
    return String(truncatedValue) + units[unit];
};

const CategoryTabs: React.FC<CategoryTabsProps> = ({ categories, selectedCategory, onSelectCategory, totalPrompts, permalinkType, basePath }) => {
  const { t } = useLanguage();
  const useLinks = permalinkType && basePath !== undefined;
  const [isExpanded, setIsExpanded] = useState(false);
  const [initialLimit, setInitialLimit] = useState(6);

  // Sort categories by count (descending)
  const sortedCategories = useMemo(() => {
      return [...categories].sort((a, b) => {
          const getCount = (item: any) => {
              if ('promptCount' in item) return item.promptCount;
              if ('postCount' in item) return item.postCount;
              if ('reelCount' in item) return item.reelCount;
              return 0;
          };
          return (getCount(b) || 0) - (getCount(a) || 0);
      });
  }, [categories]);

  useEffect(() => {
      // Use matchMedia for optimal performance compared to resize listeners
      const mediaQuery = window.matchMedia('(min-width: 1024px)'); // lg breakpoint for Desktop

      const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
          // Desktop (>= 1024px): 15 items
          // Tablet/Mobile (< 1024px): 8 items
          setInitialLimit(e.matches ? 6 : 3);
      };

      // Initial check
      handleMediaChange(mediaQuery);

      // Add listener for changes
      mediaQuery.addEventListener('change', handleMediaChange);
      
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  // Auto-expand if the selected category is hidden (index >= limit)
  useEffect(() => {
    if (selectedCategory !== 'All') {
        const index = sortedCategories.findIndex(c => c.id === selectedCategory);
        if (index >= initialLimit) {
            setIsExpanded(true);
        }
    }
  }, [selectedCategory, sortedCategories, initialLimit]);

  const renderItem = (isAll: boolean, category?: any) => {
    const id = isAll ? 'All' : category.id;
    const name = isAll ? t('common.all') : category.name;
    const count = isAll ? totalPrompts : ('promptCount' in category ? category.promptCount : 'postCount' in category ? category.postCount : category.reelCount);
    const isSelected = selectedCategory === id;

    const className = `px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
      isSelected
        ? 'bg-indigo-600 text-white shadow-lg'
        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-transparent'
    }`;

    const content = `${name} (${formatCount(count || 0)})`;

    if (useLinks) {
        const path = isAll ? basePath! : buildUrl(permalinkType!, { categoryId: id });
        return (
            <Link
                key={id}
                to={path}
                className={className}
                aria-current={isSelected ? 'page' : undefined}
            >
                {content}
            </Link>
        );
    }

    return (
        <button
            key={id}
            onClick={() => onSelectCategory(id)}
            className={className}
            aria-pressed={isSelected}
        >
            {content}
        </button>
    );
  };
  
  const visibleCategories = isExpanded ? sortedCategories : sortedCategories.slice(0, initialLimit);
  const showExpandButton = sortedCategories.length > initialLimit;

  return (
    <div className="flex justify-center items-center flex-wrap gap-2 transition-all duration-300 ease-in-out">
      {renderItem(true)}
      {visibleCategories.map(category => renderItem(false, category))}
      
      {showExpandButton && (
        <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 text-sm font-semibold rounded-full bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 transition-colors"
        >
            {isExpanded ? t('common.collapse') : t('common.showMore', { count: sortedCategories.length - initialLimit })}
        </button>
      )}
    </div>
  );
};

export default CategoryTabs;
