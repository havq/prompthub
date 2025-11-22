
import React, { useState, useEffect } from 'react';
import { Reel, ReelCategoryWithCount } from '../../types';
import { getReels, getReelCategories } from '../../services/api';
import ReelThumbnail from '../ReelThumbnail';
import Spinner from '../Spinner';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

interface ReelGridWidgetProps {
  data: any;
}

const ReelGridWidget: React.FC<ReelGridWidgetProps> = ({ data }) => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [categories, setCategories] = useState<ReelCategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const { title, categoryId, sort, limit, customLink } = data;

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            // Note: getReels API might need update to support 'sort' parameter if not already
            // assuming standard API support or default sorts
            const [reelsResponse, cats] = await Promise.all([
                getReels({
                    page: 1,
                    limit: limit || 5,
                    category: categoryId === 'All' ? undefined : categoryId,
                }),
                getReelCategories()
            ]);
            setReels(reelsResponse.reels);
            setCategories(cats);
        } catch (error) {
            console.error("Failed to fetch data for reel widget", error);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [categoryId, sort, limit]);

  const handleReelClick = (event: React.MouseEvent<HTMLDivElement>) => {
      const clickedReelId = event.currentTarget.dataset.reelId;
      if (clickedReelId) {
          navigate(`/reels/${clickedReelId}`);
      }
  };

  if (loading) {
      return <div className="flex justify-center p-8"><Spinner /></div>;
  }

  if (reels.length === 0) {
      return null; 
  }

  return (
    <div className="my-10">
        {title && (
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
                {(customLink || (categoryId && categoryId !== 'All')) && (
                     <Link 
                        to={customLink || (categoryId && categoryId !== 'All' ? `/reels/category/${categoryId}` : '/reels/explore')} 
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                     >
                         {t('common.showMore', { count: '' })} &rarr;
                     </Link>
                )}
            </div>
        )}
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {reels.map(reel => (
                <ReelThumbnail 
                    key={reel.id} 
                    reel={reel}
                    categories={categories} 
                    onClick={handleReelClick}
                />
            ))}
        </div>
    </div>
  );
};

export default ReelGridWidget;
