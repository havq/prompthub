import { Prompt, Category } from '../../utils/types';

export interface PromptCardProps {
  prompt: Prompt;
  categories: Category[];
  onFindSimilar: (prompt: Prompt) => void;
  onTagClick?: (tag: string) => void;
  onCategoryClick?: (categoryId: string) => void;
  userRating: number;
  onRate: (prompt: Prompt, newRating: number) => void;
  isFavorite: boolean;
  onToggleFavorite: (prompt: Prompt) => void;
  averageRating: number;
  ratingCount: number;
  commentCount: number;
  showcaseCount: number;
  viewCount: number;
  onClick: () => void;
  onReport: (prompt: Prompt) => void;
  onRemix: (prompt: Prompt) => void;
  onAddToCollection: (prompt: Prompt) => void;
  onUploadShowcase: (prompt: Prompt) => void;
  onRemoveFromCollection?: () => void;
  onEdit: (prompt: Prompt) => void;
  onDelete: (prompt: Prompt) => void;
  canManage?: boolean;
  viewMode?: 'grid' | 'list' | 'compact';
}
