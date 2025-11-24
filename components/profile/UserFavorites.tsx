
import React, { useMemo } from 'react';
import { Prompt, Category } from '../../utils/types';
import PromptCard from '../PromptCard';
import { useLanguage } from '../../context/LanguageContext';
// @ts-ignore
import { Link } from 'react-router-dom';

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

interface UserFavoritesProps {
    allPrompts: Prompt[];
    favorites: Set<string>;
    cardProps: CardProps;
}

const UserFavorites: React.FC<UserFavoritesProps> = ({ allPrompts, favorites, cardProps }) => {
    const { t, tComponent } = useLanguage();

    const favoritePrompts = useMemo(() => {
        return allPrompts.filter(p => favorites.has(p.id)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allPrompts, favorites]);

    if (favoritePrompts.length === 0) {
        return (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
                <p className="text-gray-600 dark:text-gray-400">
                    {tComponent('profile.noFavorites', { '1': (text) => <Link to="/" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{text}</Link> })}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
            {favoritePrompts.map(prompt => {
                const { currentUser, isAdmin, ...restCardProps } = cardProps;
                const avgRatingData = cardProps.averageRatings[prompt.id] || { average: 0, count: 0 };
                const canManage = isAdmin || (currentUser && prompt.authorId === currentUser.uid);
                return (
                    <PromptCard 
                        key={prompt.id} 
                        prompt={prompt}
                        {...restCardProps}
                        userRating={cardProps.ratings[prompt.id] || 0}
                        isFavorite={true}
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

export default UserFavorites;
