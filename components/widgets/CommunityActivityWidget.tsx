
import React from 'react';
import { CommunityActivityWidgetData } from '../../utils/types';
import RankingListWidget from './RankingListWidget';
import CategoryRankingWidget from './CategoryRankingWidget';
import NewCommentsListWidget from './NewCommentsListWidget';
import { useLanguage } from '../../context/LanguageContext';

const CommunityActivityWidget: React.FC<{ data: CommunityActivityWidgetData; deletedPromptIds?: Set<string> }> = ({ data, deletedPromptIds }) => {
    const { t } = useLanguage();
    
    const activeLimit = data.activeLimit ?? data.limit ?? 5;
    const favoriteLimit = data.favoriteLimit ?? data.limit ?? 5;
    const categoryLimit = data.categoryLimit ?? data.limit ?? 5;
    const commentLimit = data.commentLimit ?? data.limit ?? 5;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-12">
            <div className="bg-white dark:bg-[#131519] border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors h-full">
                <RankingListWidget data={{ title: data.activeTitle || t('widgets.mostActiveTitle'), icon: 'trending', dataSource: 'views', limit: activeLimit }} deletedPromptIds={deletedPromptIds} />
            </div>
            <div className="bg-white dark:bg-[#131519] border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors h-full">
                <RankingListWidget data={{ title: data.favoriteTitle || t('widgets.mostFavoriteTitle'), icon: 'heart', dataSource: 'favorites', limit: favoriteLimit }} deletedPromptIds={deletedPromptIds} />
            </div>
            <div className="bg-white dark:bg-[#131519] border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors h-full">
                <CategoryRankingWidget data={{ title: data.categoryTitle || t('widgets.hotCategoriesTitle'), limit: categoryLimit }} />
            </div>
            <div className="bg-white dark:bg-[#131519] border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors h-full">
                <NewCommentsListWidget data={{ title: data.commentTitle || t('widgets.newCommentsTitle'), limit: commentLimit }} deletedPromptIds={deletedPromptIds} />
            </div>
        </div>
    );
};

export default CommunityActivityWidget;
