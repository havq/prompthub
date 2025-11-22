
import React, { useState, useEffect } from 'react';
import { Post } from '../../types';
import { getPosts, getPostCategories } from '../../services/api';
import PostCard from '../PostCard';
import Spinner from '../Spinner';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { buildUrl } from '../../utils/permalinks';

interface PostGridWidgetProps {
  data: any;
}

const PostGridWidget: React.FC<PostGridWidgetProps> = ({ data }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  
  const { title, categoryId, sort, limit, viewMode, customLink } = data;

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            const [postsResponse, cats] = await Promise.all([
                getPosts({
                    page: 1,
                    limit: limit || 6,
                    sortBy: sort || 'newest',
                    category: categoryId === 'All' ? undefined : categoryId,
                    isAdmin: false
                }),
                getPostCategories()
            ]);
            setPosts(postsResponse.posts);
            setCategories(cats);
        } catch (error) {
            console.error("Failed to fetch data for post widget", error);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [categoryId, sort, limit]);

  let containerClasses = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8';
  if (viewMode === 'list') {
      containerClasses = 'flex flex-col space-y-6';
  }

  if (loading) {
      return <div className="flex justify-center p-8"><Spinner /></div>;
  }

  if (posts.length === 0) {
      return null; 
  }

  return (
    <div className="my-10">
        {title && (
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
                {(customLink || (categoryId && categoryId !== 'All')) && (
                     <Link 
                        to={customLink || buildUrl('postCategory', { categoryId: categoryId! })} 
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                     >
                         {t('common.showMore', { count: '' })} &rarr;
                     </Link>
                )}
            </div>
        )}
        
        <div className={containerClasses}>
            {posts.map(post => (
                <PostCard key={post.id} post={post} categories={categories} />
            ))}
        </div>
    </div>
  );
};

export default PostGridWidget;
