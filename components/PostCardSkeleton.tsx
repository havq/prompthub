import React from 'react';

const PostCardSkeleton: React.FC = () => {
    return (
        <div className="group flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden animate-pulse">
            <div className="aspect-video bg-gray-300 dark:bg-gray-700"></div>
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex flex-wrap gap-2 mb-3">
                    <div className="h-5 w-20 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                    <div className="h-5 w-24 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                </div>
                <div className="space-y-2 mb-4">
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
                <div className="space-y-2 flex-grow">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
                <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                        <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        </div>
    );
};
export default PostCardSkeleton;