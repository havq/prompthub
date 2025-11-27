import React, { useEffect, useState, useRef } from 'react';
import { RankingListWidgetData, Prompt } from '../../utils/types';
import { getPrompts } from '../../services/api';
import { Link } from 'react-router-dom';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import { getImageUrls } from '../PromptCard/utils';
import { buildUrl } from '../../utils/permalinks';
import { useLanguage } from '../../context/LanguageContext';
import Spinner from '../Spinner';

const RankingListWidget: React.FC<{ data: RankingListWidgetData }> = ({ data }) => {
    const [items, setItems] = useState<Prompt[]>([]);
    const [loading, setLoading] = useState(true);
    const isMounted = useRef(true);
    const { t } = useLanguage();

    // Destructure primitive values to use in dependency array
    const limit = data.limit;
    const dataSource = data.dataSource;

    useEffect(() => {
        isMounted.current = true;
        const fetchData = async () => {
            setLoading(true);
            try {
                const sortByMap: Record<string, string> = {
                    'views': 'views',
                    'favorites': 'rating',
                    'remixes': 'remixes'
                };
                const sortParam = sortByMap[dataSource || 'views'] || 'views';
                
                const res = await getPrompts({ page: 1, limit: limit || 5, sortBy: sortParam as any });
                if (isMounted.current) {
                    setItems(res.prompts);
                }
            } catch (error) {
                console.error("Failed to fetch ranking list", error);
            } finally {
                if (isMounted.current) setLoading(false);
            }
        };

        fetchData();
        return () => { isMounted.current = false; };
    }, [limit, dataSource]); // Only re-run if limit or dataSource changes

    const getIcon = () => {
        if (data.icon === 'heart') return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-500"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>;
        if (data.icon === 'trending') return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-500"><path fillRule="evenodd" d="M1.5 7.125c0-1.036.84-1.875 1.875-1.875h6c1.036 0 1.875.84 1.875 1.875v3.75c0 1.036-.84 1.875-1.875 1.875h-6A1.875 1.875 0 011.5 10.875v-3.75zm12 1.5c0-1.036.84-1.875 1.875-1.875h5.25c1.035 0 1.875.84 1.875 1.875v4.5c0 1.036-.84 1.875-1.875 1.875h-5.25A1.875 1.875 0 0113.5 13.125v-4.5zM3.375 15h17.25c1.035 0 1.875.84 1.875 1.875v1.5c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 18.375v-1.5C1.5 15.84 2.34 15 3.375 15z" clipRule="evenodd" /></svg>;
        return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-500"><path d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.176 7.547 7.547 0 01-1.705-1.715.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>;
    };

    return (
        <div className="h-full">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-800 pb-3">
                {getIcon()}
                <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-white">{data.title}</h3>
            </div>
            {loading ? (
                <div className="flex justify-center py-10"><Spinner size="sm" /></div>
            ) : (
                <ul className="space-y-3">
                    {items.map((item, index) => {
                        const images = getImageUrls(item.imageUrl);
                        const displayImage = images.length > 0 ? images[0] : '';
                        
                        return (
                            <li key={item.id} className="flex items-center gap-3 group cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/60 p-1.5 rounded-lg transition-colors">
                                <span className={`text-base font-bold w-6 text-center ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-700' : 'text-gray-600 dark:text-gray-500'}`}>
                                    {index + 1}
                                </span>
                                <Link to={buildUrl('prompt', { promptId: item.id })} className="flex items-center gap-3 flex-grow min-w-0">
                                    {displayImage ? (
                                        <img src={transformCloudinaryUrl(displayImage, 'w_80,h_80,c_fill')} className="w-10 h-10 object-cover rounded bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" alt="thumb" />
                                    ) : (
                                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded flex items-center justify-center">
                                            <span className="text-xs text-gray-500">...</span>
                                        </div>
                                    )}
                                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors">{item.title || item.text}</span>
                                </Link>
                            </li>
                        );
                    })}
                    {items.length === 0 && <li className="text-xs text-gray-500 italic text-center">{t('widgets.noItemsFound')}</li>}
                </ul>
            )}
            <Link to="/prompts-list" className="block mt-4 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-right transition-colors">{t('common.showMore', { count: '' })} &rarr;</Link>
        </div>
    );
};

export default RankingListWidget;