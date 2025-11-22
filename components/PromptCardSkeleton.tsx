
import React from 'react';

interface PromptCardSkeletonProps {
  viewMode?: 'grid' | 'list' | 'compact';
}

const PromptCardSkeleton: React.FC<PromptCardSkeletonProps> = ({ viewMode = 'grid' }) => {

  if (viewMode === 'compact') {
    return (
      <div className="relative aspect-square bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse"></div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 w-full animate-pulse">
        <div className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 bg-gray-300 dark:bg-gray-700 rounded-md"></div>
        <div className="flex-grow flex flex-col h-full min-w-0 space-y-3 pt-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          <div className="!mt-auto pt-4 flex justify-between">
            <div className="h-9 w-20 bg-gray-300 dark:bg-gray-600 rounded-md"></div>
            <div className="h-9 w-24 bg-gray-300 dark:bg-gray-600 rounded-md"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col h-full border border-gray-200 dark:border-gray-700 w-full animate-pulse">
      <div className="relative aspect-square bg-gray-300 dark:bg-gray-700 rounded-t-lg"></div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded-full w-20"></div>
        </div>
        <div className="space-y-2 mb-3 h-20">
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded-full w-16"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded-full w-20"></div>
        </div>

        <div className="mt-auto pt-3 border-t border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>
            <div className="h-4 w-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2 min-h-[20px]">
            <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <div className="flex items-center gap-2">
                <div className="h-4 w-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div className="h-4 w-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div className="h-4 w-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="h-9 w-20 bg-gray-300 dark:bg-gray-600 rounded-md"></div>
            <div className="h-9 w-24 bg-gray-300 dark:bg-gray-600 rounded-md"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptCardSkeleton;
