import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const { t } = useLanguage();

  const getPageNumbers = (): (string | number)[] => {
    // Return empty if no pages to show
    if (totalPages <= 1) return [];

    // Show all pages if there are 7 or fewer, as it's not too long
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const sideWidth = 1; // Number of pages on each side of the current page. e.g., 1 means [current-1, current, current+1]
    const pageNumbers: number[] = [];

    // Determine which page numbers to show
    for(let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || // always show the first page
            i === totalPages || // always show the last page
            (i >= currentPage - sideWidth && i <= currentPage + sideWidth) // show pages around the current page
        ) {
            if (!pageNumbers.includes(i)) {
                pageNumbers.push(i);
            }
        }
    }
    
    // Insert ellipsis '...' where there are gaps in page numbers
    const pagesWithEllipsis: (number | string)[] = [];
    let lastPage = 0;
    for (const page of pageNumbers) {
        if (lastPage) {
            if (page - lastPage > 1) {
                pagesWithEllipsis.push('...');
            }
        }
        pagesWithEllipsis.push(page);
        lastPage = page;
    }

    return pagesWithEllipsis;
  };

  const pages = getPageNumbers();
  
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="flex justify-center items-center flex-wrap gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm font-semibold rounded-md transition-all duration-300 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 dark:border-gray-600"
      >
        {t('home.pagination.previous')}
      </button>
      {pages.map((page, index) => (
        <React.Fragment key={index}>
          {typeof page === 'number' ? (
            <button
              onClick={() => onPageChange(page)}
              className={`w-10 h-10 flex items-center justify-center text-sm font-semibold rounded-md transition-all duration-300 border ${
                currentPage === page
                  ? 'bg-indigo-600 text-white shadow-lg border-indigo-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600'
              }`}
            >
              {page}
            </button>
          ) : (
            <span className="w-10 h-10 flex items-center justify-center text-sm font-semibold text-gray-500 dark:text-gray-400">...</span>
          )}
        </React.Fragment>
      ))}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm font-semibold rounded-md transition-all duration-300 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 dark:border-gray-600"
      >
        {t('home.pagination.next')}
      </button>
    </nav>
  );
};

export default Pagination;