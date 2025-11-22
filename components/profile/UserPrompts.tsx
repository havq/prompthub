import React from 'react';
import { Prompt } from '../../types';
import PromptCard from '../PromptCard';
import { useLanguage } from '../../context/LanguageContext';

interface CardProps {
    categories: any[];
    ratings: Record<string, number>;
    favorites: Set<string>;
    averageRatings: Record<string, { average: number; count: number }>;
    commentCounts: Record<string, number>;
    showcaseCounts: Record<string, number>;
    isAdmin: boolean;
    currentUser: any;
    onRate: (prompt: Prompt, rating: number) => void;
    onToggleFavorite: (prompt: Prompt) => void;
    onFindSimilar: (prompt: Prompt) => void;
    onOpenDetail: (prompt: Prompt) => void;
    onReport: (prompt: Prompt) => void;
    onRemix: (prompt: Prompt) => void;
    onAddToCollection: (prompt: Prompt) => void;
    onUploadShowcase: (prompt: Prompt) => void;
    onEdit: (prompt: Prompt) => void;
    onDelete: (prompt: Prompt) => void;
}

interface UserPromptsProps {
    prompts: Prompt[];
    cardProps: CardProps;
    isOwner: boolean;
    username: string;
    emptyMessage?: React.ReactNode;
}

const UserPrompts: React.FC<UserPromptsProps> = ({ prompts, cardProps, isOwner, username, emptyMessage }) => {
    const { t } = useLanguage();

    if (prompts.length === 0) {
        const defaultMessage = isOwner ? t('profile.noPrompts') : t('authorPage.noPromptsMessage', {authorName: username});
        return (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
                <p className="text-gray-600 dark:text-gray-400">{emptyMessage || defaultMessage}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
            {prompts.map(prompt => {
                const { currentUser, isAdmin, ...restCardProps } = cardProps;
                const avgRatingData = cardProps.averageRatings[prompt.id] || { average: 0, count: 0 };
                const canManage = isOwner || isAdmin;
                return (
                    <PromptCard 
                        key={prompt.id} 
                        prompt={prompt}
                        {...restCardProps}
                        userRating={cardProps.ratings[prompt.id] || 0}
                        isFavorite={cardProps.favorites.has(prompt.id)}
                        averageRating={avgRatingData.average}
                        ratingCount={avgRatingData.count}
                        commentCount={cardProps.commentCounts[prompt.id] || 0}
                        showcaseCount={cardProps.showcaseCounts[prompt.id] || 0}
                        // FIX: Add missing viewCount prop to PromptCard.
                        viewCount={prompt.viewCount || 0}
                        onClick={() => cardProps.onOpenDetail(prompt)}
                        canManage={canManage}
                    />
                );
            })}
        </div>
    );
};

export default UserPrompts;