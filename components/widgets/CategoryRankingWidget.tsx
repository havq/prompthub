
import React, { useEffect, useState, useRef } from 'react';
import { CategoryRankingWidgetData, CategoryWithCount } from '../../utils/types';
import { getCategories } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import Spinner from '../Spinner';

const CategoryRankingWidget: React.FC<{ data: CategoryRankingWidgetData }> = ({ data }) => {
    const [categories, setCategories] = useState<CategoryWithCount[]>([]);
    const [loading, setLoading] = useState(true);
    const isMounted = useRef(true);
    const { t } = useLanguage();
    useEffect(() => {
        isMounted.current = true;
        setLoading(true);
        getCategories().then(cats => {
            if (!isMounted.current) return;
            // Sort by count to simulate popularity
            const sorted = cats.sort((a, b) => b.promptCount - a.promptCount).slice(0, data.limit || 5);
            setCategories(sorted);
            setLoading(false);
        }).catch(err => {
            console.error("Failed to fetch categories ranking", err);
            if (isMounted.current) setLoading(false);
        });

        return () => { isMounted.current = false; };
    }, [data.limit]);
    
    const colors = [
        'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900',
        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900',
        'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-900',
        'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900',
        'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900'
    ];

    return (
        <div className="h-full">
             <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-800 pb-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-500"><path fillRule="evenodd" d="M1.5 7.125c0-1.036.84-1.875 1.875-1.875h6c1.036 0 1.875.84 1.875 1.875v3.75c0 1.036-.84 1.875-1.875 1.875h-6A1.875 1.875 0 011.5 10.875v-3.75zm12 1.5c0-1.036.84-1.875 1.875-1.875h5.25c1.035 0 1.875.84 1.875 1.875v4.5c0 1.036-.84 1.875-1.875 1.875h-5.25A1.875 1.875 0 0113.5 13.125v-4.5zM3.375 15h17.25c1.035 0 1.875.84 1.875 1.875v1.5c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 18.375v-1.5C1.5 15.84 2.34 15 3.375 15z" clipRule="evenodd" /></svg>
                <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-white">{data.title}</h3>
            </div>
            {loading ? (
                <div className="flex justify-center py-10"><Spinner size="sm" /></div>
            ) : (
                 <ul className="space-y-4 mt-6">
                    {categories.map((cat, index) => (
                        <li key={cat.id} className="flex items-center gap-3">
                            <span className="text-sm font-bold w-5 text-center text-gray-600 dark:text-gray-500">{index + 1}.</span>
                            <Link to={`category/${cat.id}`} className={`flex-grow flex justify-between items-center px-4 py-2 rounded-full text-xs font-bold border ${colors[index % colors.length] || 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'} hover:opacity-80 transition-opacity`}>
                                <span className="truncate">{cat.name}</span>
                                <span className="ml-2 opacity-70 text-[10px]">({cat.promptCount})</span>
                            </Link>
                        </li>
                    ))}
                 </ul>
            )}
             <Link to="/prompts-list" className="block mt-4 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-right transition-colors">{t('common.showMore', { count: '' })} &rarr;</Link>
        </div>
    );
};

export default CategoryRankingWidget;
