import React, { useState, useEffect, useRef } from 'react';
import { PromptGridWidgetData, Prompt, CategoryWithCount } from '../../types';
import { getPrompts } from '../../services/api';
import PromptCard from '../PromptCard';
import Spinner from '../Spinner';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { buildUrl } from '../../utils/permalinks';

interface PromptGridWidgetProps {
  data: PromptGridWidgetData;
  categories: CategoryWithCount[];
  // Pass down interaction handlers from parent to reuse logic/modals
  onOpenDetail: (prompt: Prompt) => void;
  cardProps: any; 
}

const PromptGridWidget: React.FC<PromptGridWidgetProps> = ({ data, categories, onOpenDetail, cardProps }) => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const { title, categoryId, tag, sort, limit, viewMode, desktopCols, tabletCols, mobileCols, customLink } = data;
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchWidgetPrompts = async () => {
        setLoading(true);
        try {
            const response = await getPrompts({
                page: 1,
                limit: limit || 8,
                sortBy: sort || 'newest',
                category: categoryId === 'All' ? undefined : categoryId,
                tag: tag,
                isAdmin: false // Widgets usually show public data
            });
            setPrompts(response.prompts);
        } catch (error) {
            console.error("Failed to fetch prompts for widget", error);
        } finally {
            setLoading(false);
        }
    };
    fetchWidgetPrompts();
  }, [categoryId, tag, sort, limit]);

  const scroll = (direction: 'left' | 'right') => {
      if (scrollContainerRef.current) {
          const { clientWidth } = scrollContainerRef.current;
          const scrollAmount = clientWidth * 0.8; // Scroll 80% of view
          scrollContainerRef.current.scrollBy({ 
              left: direction === 'left' ? -scrollAmount : scrollAmount, 
              behavior: 'smooth' 
          });
      }
  };

  // Function to generate Tailwind class strings based on column counts for grid
  const getGridColsClass = (cols: number | undefined, prefix: string = '') => {
      if (!cols) return '';
      
      const gridMap: Record<number, string> = {
          1: 'grid-cols-1',
          2: 'grid-cols-2',
          3: 'grid-cols-3',
          4: 'grid-cols-4',
          5: 'grid-cols-5',
          6: 'grid-cols-6',
      };

      const baseClass = gridMap[cols];
      if (!baseClass) return '';
      
      return prefix ? `${prefix}:${baseClass}` : baseClass;
  };

  // Function to calculate width classes for Slider items based on column configuration
  const getSliderWidthClass = (cols: number) => {
      const widthMap: Record<number, string> = {
          1: 'w-[85vw]', 
          2: 'w-[44vw]', // Slightly less than 45 to ensure gap fits well
          3: 'w-[29vw]', 
          4: 'w-[22vw]', 
          5: 'w-[18vw]', 
          6: 'w-[15vw]', 
      };
      return widthMap[cols] || 'w-[22vw]';
  };

  if (loading) {
      return <div className="flex justify-center p-8"><Spinner /></div>;
  }

  if (prompts.length === 0) {
      return null; 
  }
  
  const isSlider = viewMode === 'slider-1' || viewMode === 'slider-2';
  
  // Prepare content for Slider Mode
  let sliderContent: React.ReactNode;
  if (isSlider) {
      // Use configured columns to determine item width
      // Default to 1 for mobile, 3 for tablet, 4 for desktop if not set
      const widthClass = `${getSliderWidthClass(mobileCols || 1)} md:${getSliderWidthClass(tabletCols || 3)} lg:${getSliderWidthClass(desktopCols || 4)}`;

      const renderPrompt = (prompt: Prompt) => {
            // Logic reused from PromptCard props
            const avgRatingData = cardProps.averageRatings[prompt.id] || { average: 0, count: 0 };
            const canManage = isAdmin || (currentUser && prompt.authorId === currentUser.uid);
            
            return (
                 <PromptCard 
                    key={prompt.id} 
                    prompt={prompt} 
                    // Force 'compact' style inside slider for card appearance
                    viewMode='compact'
                    categories={categories} 
                    onFindSimilar={cardProps.onFindSimilar}                 
                    onTagClick={(t) => navigate(buildUrl('tag', { tag: t }))} 
                    onCategoryClick={(c) => navigate(buildUrl('promptCategory', { categoryId: c }))}
                    userRating={cardProps.ratings[prompt.id] || 0} 
                    onRate={cardProps.onRate}
                    isFavorite={cardProps.favorites.has(prompt.id)} 
                    onToggleFavorite={cardProps.onToggleFavorite} 
                    averageRating={avgRatingData.average} 
                    ratingCount={avgRatingData.count} 
                    commentCount={cardProps.commentCounts[prompt.id] || 0} 
                    showcaseCount={cardProps.showcaseCounts[prompt.id] || 0} 
                    viewCount={prompt.viewCount || 0} 
                    onClick={() => onOpenDetail(prompt)} 
                    onReport={cardProps.onReport} 
                    onRemix={cardProps.onRemix} 
                    onAddToCollection={cardProps.onAddToCollection} 
                    onUploadShowcase={cardProps.onUploadShowcase} 
                    onEdit={cardProps.onEdit} 
                    onDelete={cardProps.onDelete} 
                    canManage={canManage} 
                />
            );
      };

      if (viewMode === 'slider-2') {
          // Chunk prompts into pairs for 2 rows
          const chunkedPrompts = [];
          for (let i = 0; i < prompts.length; i += 2) {
              chunkedPrompts.push(prompts.slice(i, i + 2));
          }
          
          sliderContent = chunkedPrompts.map((chunk, index) => (
              <div key={index} className={`flex-shrink-0 snap-start flex flex-col gap-6 ${widthClass}`}>
                  {chunk.map(prompt => renderPrompt(prompt))}
              </div>
          ));
      } else {
          // Slider 1 Row
          sliderContent = prompts.map(prompt => (
               <div key={prompt.id} className={`flex-shrink-0 snap-start ${widthClass}`}>
                   {renderPrompt(prompt)}
               </div>
          ));
      }
  }

  // Default classes if no custom cols are provided (for standard Grid view)
  let containerClasses = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6';

  if (viewMode === 'list') {
      containerClasses = 'flex flex-col space-y-4';
  } else if (viewMode === 'compact') {
       if (desktopCols || tabletCols || mobileCols) {
           const mobile = getGridColsClass(mobileCols || 2, '');
           const tablet = getGridColsClass(tabletCols || 3, 'md');
           const desktop = getGridColsClass(desktopCols || 5, 'lg');
           containerClasses = `grid ${mobile} ${tablet} ${desktop} gap-2`;
       } else {
           containerClasses = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2';
       }
  } else if (viewMode === 'grid') {
       if (desktopCols || tabletCols || mobileCols) {
           const mobile = getGridColsClass(mobileCols || 1, '');
           const tablet = getGridColsClass(tabletCols || 3, 'md');
           const desktop = getGridColsClass(desktopCols || 4, 'lg');
           containerClasses = `grid ${mobile} ${tablet} ${desktop} gap-6`;
       }
  }

  return (
    <div className="my-10 group/widget relative">
        {title && (
            <div className="flex justify-between items-end mb-6 px-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
                {(customLink || (categoryId && categoryId !== 'All')) && (
                     <Link 
                        to={customLink || buildUrl('promptCategory', { categoryId: categoryId! })} 
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                     >
                         {t('common.showMore', { count: '' })} &rarr;
                     </Link>
                )}
            </div>
        )}
        
        {isSlider ? (
             <div className="relative">
                <div 
                    ref={scrollContainerRef}
                    className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth pb-4 px-1"
                >
                    {sliderContent}
                </div>
                
                {/* Navigation Buttons */}
                <button 
                    onClick={() => scroll('left')} 
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-[30] bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 p-2 rounded-full shadow-lg opacity-0 group-hover/widget:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none hidden md:block"
                    aria-label="Scroll Left"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button 
                    onClick={() => scroll('right')} 
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-[30] bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 p-2 rounded-full shadow-lg opacity-0 group-hover/widget:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none hidden md:block"
                    aria-label="Scroll Right"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        ) : (
            <div className={containerClasses}>
                {prompts.map(prompt => {
                    const avgRatingData = cardProps.averageRatings[prompt.id] || { average: 0, count: 0 };
                    const canManage = isAdmin || (currentUser && prompt.authorId === currentUser.uid);

                    return (
                        <PromptCard 
                            key={prompt.id} 
                            prompt={prompt} 
                            viewMode={viewMode || 'grid'}
                            categories={categories} 
                            onFindSimilar={cardProps.onFindSimilar}
                            onTagClick={(t) => navigate(buildUrl('tag', { tag: t }))} 
                            onCategoryClick={(c) => navigate(buildUrl('promptCategory', { categoryId: c }))}
                            userRating={cardProps.ratings[prompt.id] || 0} 
                            onRate={cardProps.onRate}
                            isFavorite={cardProps.favorites.has(prompt.id)} 
                            onToggleFavorite={cardProps.onToggleFavorite} 
                            averageRating={avgRatingData.average} 
                            ratingCount={avgRatingData.count} 
                            commentCount={cardProps.commentCounts[prompt.id] || 0} 
                            showcaseCount={cardProps.showcaseCounts[prompt.id] || 0} 
                            viewCount={prompt.viewCount || 0} 
                            onClick={() => onOpenDetail(prompt)} 
                            onReport={cardProps.onReport} 
                            onRemix={cardProps.onRemix} 
                            onAddToCollection={cardProps.onAddToCollection} 
                            onUploadShowcase={cardProps.onUploadShowcase} 
                            onEdit={cardProps.onEdit} 
                            onDelete={cardProps.onDelete} 
                            canManage={canManage} 
                        />
                    );
                })}
            </div>
        )}
    </div>
  );
};

export default PromptGridWidget;