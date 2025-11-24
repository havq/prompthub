
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Prompt, Category } from '../utils/types';
import { findSimilarPrompts } from '../services/similarityService';
import PromptCard from './PromptCard';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { transformCloudinaryUrl } from '../services/cloudinaryUtils';
import { getImageUrls } from './PromptCard/utils';

interface SimilarPromptsModalProps {
  sourcePrompt: Prompt;
  allPrompts: Prompt[];
  categories: Category[];
  onClose: () => void;
  onFindSimilar: (prompt: Prompt) => void;
  ratings: Record<string, number>;
  onRatePrompt: (prompt: Prompt, rating: number) => void;
  favorites: Set<string>;
  onToggleFavorite: (prompt: Prompt) => void;
  averageRatings: Record<string, { average: number; count: number }>;
  commentCounts: Record<string, number>;
  onPromptClick: (prompt: Prompt) => void;
  onReport: (prompt: Prompt) => void;
  onRemix: (prompt: Prompt) => void;
  onAddToCollection: (prompt: Prompt) => void;
  showcaseCounts: Record<string, number>;
  onUploadShowcase: (prompt: Prompt) => void;
  onEdit: (prompt: Prompt) => void;
  onDelete: (prompt: Prompt) => void;
}

const SimilarPromptsModal: React.FC<SimilarPromptsModalProps> = ({ sourcePrompt, allPrompts, categories, onClose, onFindSimilar, ratings: initialRatings, onRatePrompt: parentOnRatePrompt, favorites, onToggleFavorite, averageRatings: initialAverageRatings, commentCounts, onPromptClick, onReport, onRemix, onAddToCollection, showcaseCounts, onUploadShowcase, onEdit, onDelete }) => {
  const [similarPrompts, setSimilarPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();
  const { currentUser, userProfile, isAdmin } = useAuth();
  
  // Internal state for ratings to allow instant updates within the modal
  const [ratings, setRatings] = useState(initialRatings);
  const [averageRatings, setAverageRatings] = useState(initialAverageRatings);

  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [isTextLong, setIsTextLong] = useState(false);
  const promptTextRef = useRef<HTMLParagraphElement>(null);

  const sourceImageUrls = getImageUrls(sourcePrompt.imageUrl);
  const displaySourceImage = transformCloudinaryUrl(sourceImageUrls[0] || '', 'w_400,c_fill');

  useEffect(() => {
      setIsTextExpanded(false);
      const timer = setTimeout(() => {
          if (promptTextRef.current) {
              setIsTextLong(promptTextRef.current.scrollHeight > promptTextRef.current.clientHeight);
          }
      }, 50);
      return () => clearTimeout(timer);
  }, [sourcePrompt.text]);

  useEffect(() => {
    setRatings(initialRatings);
  }, [initialRatings]);

  useEffect(() => {
    setAverageRatings(initialAverageRatings);
  }, [initialAverageRatings]);

  const handleRatePrompt = useCallback(async (prompt: Prompt, newRating: number) => {
    if (!currentUser || !userProfile) return;

    // Call the parent's rate function which has the robust refetch logic
    parentOnRatePrompt(prompt, newRating);

    // Also update local state for immediate feedback inside the modal
    setRatings(prev => ({...prev, [prompt.id]: newRating}));
    
    // To update the average rating display immediately, we can do an optimistic update
    // or wait for the parent to pass down new props. For simplicity, we'll rely on the parent's update.
    // The parent's `onRatePrompt` should trigger a state update that re-renders this modal with new `averageRatings`.

  }, [currentUser, userProfile, parentOnRatePrompt]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      const results = findSimilarPrompts(sourcePrompt, allPrompts, 8);
      setSimilarPrompts(results);
      setIsLoading(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [sourcePrompt, allPrompts]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="similar-prompts-title">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-[90vh] relative flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 id="similar-prompts-title" className="text-2xl font-bold text-gray-900 dark:text-white">{t('modals.similarPromptsTitle')}</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white" aria-label="Close modal">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">{t('modals.sourcePrompt')}</h3>
            <div className="flex flex-col md:flex-row gap-6 items-start bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg">
              <img src={displaySourceImage} alt="Source prompt image" className="w-48 h-48 object-cover rounded-lg shadow-md flex-shrink-0" />
              <div className="flex-grow">
                  <p ref={promptTextRef} className={`text-gray-700 dark:text-gray-300 whitespace-pre-wrap ${!isTextExpanded ? 'line-clamp-5' : ''}`}>
                      {sourcePrompt.text}
                  </p>
                  {isTextLong && (
                      <button onClick={() => setIsTextExpanded(!isTextExpanded)} className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold mt-2">
                          {isTextExpanded ? t('common.collapse') : t('common.expand')}
                      </button>
                  )}
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>

          <div>
            <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4">{t('modals.results')}</h3>
            {isLoading ? (
              <div className="text-center py-10">
                <p className="text-xl text-gray-700 dark:text-gray-300">{t('modals.searchingSimilar')}</p>
              </div>
            ) : similarPrompts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {similarPrompts.map(prompt => {
                  const avgRatingData = averageRatings[prompt.id] || { average: 0, count: 0 };
                  const canManage = isAdmin || (currentUser && prompt.authorId === currentUser.uid);
                  return (
                    <PromptCard 
                      key={prompt.id} 
                      prompt={prompt} 
                      categories={categories} 
                      onFindSimilar={onFindSimilar}
                      userRating={ratings[prompt.id] || 0}
                      onRate={handleRatePrompt}
                      isFavorite={favorites.has(prompt.id)}
                      onToggleFavorite={onToggleFavorite}
                      averageRating={avgRatingData.average}
                      ratingCount={avgRatingData.count}
                      commentCount={commentCounts[prompt.id] || 0}
                      showcaseCount={showcaseCounts[prompt.id] || 0}
                      // FIX: Add missing viewCount prop to PromptCard.
                      viewCount={prompt.viewCount || 0}
                      onClick={() => onPromptClick(prompt)}
                      onReport={onReport}
                      onRemix={onRemix}
                      onAddToCollection={onAddToCollection}
                      onUploadShowcase={onUploadShowcase}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      canManage={canManage}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-xl text-gray-700 dark:text-gray-300">{t('modals.noSimilarFound')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimilarPromptsModal;
