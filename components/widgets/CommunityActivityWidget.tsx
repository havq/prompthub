
import React from 'react';
import { CommunityActivityWidgetData } from '../../utils/types';
import RankingListWidget from './RankingListWidget';
import CategoryRankingWidget from './CategoryRankingWidget';
import NewCommentsListWidget from './NewCommentsListWidget';

const CommunityActivityWidget: React.FC<{ data: CommunityActivityWidgetData }> = ({ data }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-12">
            <div className="bg-white dark:bg-[#131519] border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors h-full">
                <RankingListWidget data={{ title: data.activeTitle || 'SÔI NỔI NHẤT', icon: 'trending', dataSource: 'views', limit: 5 }} />
            </div>
            <div className="bg-white dark:bg-[#131519] border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors h-full">
                <RankingListWidget data={{ title: data.favoriteTitle || 'YÊU THÍCH NHẤT', icon: 'heart', dataSource: 'favorites', limit: 5 }} />
            </div>
            <div className="bg-white dark:bg-[#131519] border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors h-full">
                <CategoryRankingWidget data={{ title: data.categoryTitle || 'THỂ LOẠI HOT', limit: 5 }} />
            </div>
            <div className="bg-white dark:bg-[#131519] border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors h-full">
                <NewCommentsListWidget data={{ title: data.commentTitle || 'BÌNH LUẬN MỚI', limit: 5 }} />
            </div>
        </div>
    );
};

export default CommunityActivityWidget;
