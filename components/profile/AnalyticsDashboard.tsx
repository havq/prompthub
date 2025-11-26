
import React, { useState, useEffect } from 'react';
import { getAnalyticsData } from '../../services/api';
import { AnalyticsData, Prompt } from '../../utils/types';
import Spinner from '../Spinner';
import { useLanguage } from '../../context/LanguageContext';
import Pagination from '../Pagination';

interface AnalyticsDashboardProps {
    userId: string;
}

const formatCount = (count: number | undefined): string => {
    const num = Number(count || 0);
    if (num < 1000) {
      return num.toLocaleString();
    }
    const units = ['k', 'm', 'b', 't'];
    // toFixed(0).length is a trick to get number of digits
    const unit = Math.floor((num.toFixed(0).length - 1) / 3) - 1;
    
    if (unit >= units.length) {
        return num.toLocaleString();
    }
    
    const value = num / Math.pow(1000, unit + 1);

    // Truncate to one decimal place
    const truncatedValue = Math.floor(value * 10) / 10;
    
    return String(truncatedValue) + units[unit];
};

const PROMPTS_PER_PAGE = 10;

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center space-x-4">
        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCount(value)}</p>
        </div>
    </div>
);

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ userId }) => {
    const { t } = useLanguage();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const analyticsData = await getAnalyticsData(userId, currentPage, PROMPTS_PER_PAGE);
                setData(analyticsData);
            } catch (err) {
                console.error("Failed to fetch analytics data:", err);
                setError("Could not load analytics data at this time.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [userId, currentPage]);

    if (isLoading) {
        return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    }

    if (error || !data) {
        return <div className="text-center p-8 text-red-500">{error || 'No data available.'}</div>;
    }

    const { totalViews, totalFavorites, totalRemixes, totalCollections, topPrompts, totalUserPrompts } = data;
    
    const totalPages = totalUserPrompts ? Math.ceil(totalUserPrompts / PROMPTS_PER_PAGE) : 0;

    const icons = {
        views: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
        favorites: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>,
        remixes: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /><path d="M3 10a7 7 0 0111.94-4.95l1.103-1.104a1 1 0 011.414 1.414l-1.104 1.103A7 7 0 113 10zm11.495-2.553a1 1 0 01-1.414-1.414l1.104-1.103a5 5 0 10-7.072 7.072l-1.103 1.103a1 1 0 01-1.414-1.414l1.103-1.103a5 5 0 007.072-7.072z" /></svg>,
        collections: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Views" value={totalViews} icon={icons.views} />
                <StatCard title="Total Favorites" value={totalFavorites} icon={icons.favorites} />
                <StatCard title="Total Remixes" value={totalRemixes} icon={icons.remixes} />
                <StatCard title="In Collections" value={totalCollections} icon={icons.collections} />
            </div>

            <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Top Performing Prompts</h3>
                <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-4 font-semibold text-sm">Prompt</th>
                                <th className="p-4 font-semibold text-sm text-center">Views</th>
                                <th className="p-4 font-semibold text-sm text-center">Favorites</th>
                                <th className="p-4 font-semibold text-sm text-center">Remixes</th>
                                <th className="p-4 font-semibold text-sm text-center">Collections</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {topPrompts.length > 0 ? topPrompts.map((prompt: Prompt) => (
                                <tr key={prompt.id}>
                                    <td className="p-4 max-w-sm">
                                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white" title={prompt.title}>{prompt.title}</p>
                                    </td>
                                    <td className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">{formatCount(prompt.viewCount)}</td>
                                    <td className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">{formatCount((prompt as any).favoriteCount)}</td>
                                    <td className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">{formatCount(prompt.remixCount)}</td>
                                    <td className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">{formatCount((prompt as any).collectionCount)}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No prompt data available yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>
        </div>
    );
};

export default AnalyticsDashboard;