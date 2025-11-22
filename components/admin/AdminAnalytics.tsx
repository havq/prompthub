
import React, { useMemo, useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAdminContext } from '../../context/AdminContext';
import { getAllAverageRatings } from '../../services/api';

// StatCard Component
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center space-x-4">
        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    </div>
);

// BarChart Component
interface BarChartProps {
    data: { label: string; value: number }[];
    title: string;
}

const BarChart: React.FC<BarChartProps> = ({ data, title }) => {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 0), [data]);

    if (data.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md h-full flex flex-col">
                <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h4>
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400">{t('admin.analytics.noData')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h4>
            <div className="space-y-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                        <div className="w-1/3 text-sm text-gray-600 dark:text-gray-300 truncate" title={item.label}>
                            {item.label}
                        </div>
                        <div className="w-2/3 flex items-center gap-2">
                            <div className="flex-grow bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                <div
                                    className="bg-indigo-500 h-4 rounded-full"
                                    style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <div className="w-10 text-right text-sm font-semibold text-gray-800 dark:text-gray-100">
                                {item.value}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


// Main Component
const AdminAnalytics: React.FC = () => {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const { prompts, users, categories, reports, posts, reels, showcaseImages } = useAdminContext();
    
    const [averageRatings, setAverageRatings] = useState<Record<string, { average: number; count: number }>>({});
    const [isActivityChartExpanded, setIsActivityChartExpanded] = useState(false);

    useEffect(() => {
        getAllAverageRatings().then(setAverageRatings);
    }, [prompts]);

    // Memoized calculations for stats
    const totalPrompts = useMemo(() => prompts.length, [prompts]);
    const totalPosts = useMemo(() => posts.length, [posts]);
    const totalReels = useMemo(() => reels.length, [reels]);
    const totalShowcaseImages = useMemo(() => showcaseImages.length, [showcaseImages]);
    const totalUsers = useMemo(() => users.length, [users]);
    const totalCategories = useMemo(() => categories.length, [categories]);
    const pendingReports = useMemo(() => reports.filter(r => r.status === 'pending').length, [reports]);
    const pendingPrompts = useMemo(() => prompts.filter(p => p.status === 'pending').length, [prompts]);
    
    // Data for charts
    const promptsPerCategory = useMemo(() => {
        const counts: Record<string, number> = {};
        prompts.forEach(prompt => {
            if (prompt.categoryIds && prompt.categoryIds.length > 0) {
                prompt.categoryIds.forEach(catId => {
                    counts[catId] = (counts[catId] || 0) + 1;
                });
            } else {
                counts['unclassified'] = (counts['unclassified'] || 0) + 1;
            }
        });

        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        
        return Object.entries(counts)
            .map(([catId, value]) => ({
                label: categoryMap.get(catId) || 'Unclassified',
                value
            }))
            .sort((a, b) => b.value - a.value);
    }, [prompts, categories]);

    const promptsLastXDays = useMemo(() => {
        const daysToShow = isActivityChartExpanded ? 30 : 7;
        const countsByDay: Record<string, number> = {};
        const xDaysAgo = new Date();
        xDaysAgo.setDate(xDaysAgo.getDate() - daysToShow);

        for(let i = 0; i < daysToShow; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            countsByDay[date.toISOString().split('T')[0]] = 0;
        }

        prompts.forEach(prompt => {
            try {
                const promptDate = new Date(prompt.createdAt);
                 if (promptDate >= xDaysAgo) {
                    const dateString = promptDate.toISOString().split('T')[0];
                    if(countsByDay[dateString] !== undefined) {
                        countsByDay[dateString]++;
                    }
                }
            } catch (e) {
                console.error(`Invalid date for prompt ${prompt.id}: ${prompt.createdAt}`);
            }
        });

        return Object.entries(countsByDay)
            .map(([date, value]) => ({ label: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value }))
            .reverse();
    }, [prompts, isActivityChartExpanded]);

    const topContributors = useMemo(() => {
        const counts: Record<string, number> = {};
        prompts.forEach(p => {
            if(p.authorId) counts[p.authorId] = (counts[p.authorId] || 0) + 1;
        });

        const userMap = new Map(users.map(u => [u.uid, u.username]));

        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([authorId, value]) => ({
                label: userMap.get(authorId) || 'Unknown',
                value
            }));
    }, [prompts, users]);

    const mostRemixed = useMemo(() => {
        return [...prompts]
            .filter(p => p.remixCount && p.remixCount > 0)
            .sort((a,b) => (b.remixCount || 0) - (a.remixCount || 0))
            .slice(0, 5)
            .map(p => ({
                label: (p.title || p.text).substring(0, 40) + '...',
                value: p.remixCount || 0
            }));
    }, [prompts]);

    const mostViewedPosts = useMemo(() => {
        return [...posts]
            .filter(p => p.viewCount && p.viewCount > 0)
            .sort((a,b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, 5)
            .map(p => ({
                label: p.title.substring(0, 40) + '...',
                value: p.viewCount || 0
            }));
    }, [posts]);
    
    const mostViewedReels = useMemo(() => {
        return [...reels]
            .filter(r => r.viewCount && r.viewCount > 0)
            .sort((a,b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, 5)
            .map(r => ({
                label: r.title.substring(0, 40) + '...',
                value: r.viewCount || 0
            }));
    }, [reels]);

    const mostCommentedPrompts = useMemo(() => {
        return [...prompts]
            .filter(p => p.commentCount && p.commentCount > 0)
            .sort((a,b) => (b.commentCount || 0) - (a.commentCount || 0))
            .slice(0, 5)
            .map(p => ({
                label: (p.title || p.text).substring(0, 40) + '...',
                value: p.commentCount || 0
            }));
    }, [prompts]);

    const mostCommentedPosts = useMemo(() => {
        return [...posts]
            .filter(p => p.commentCount && p.commentCount > 0)
            .sort((a,b) => (b.commentCount || 0) - (a.commentCount || 0))
            .slice(0, 5)
            .map(p => ({
                label: p.title.substring(0, 40) + '...',
                value: p.commentCount || 0
            }));
    }, [posts]);
    
    const mostCommentedReels = useMemo(() => {
        return [...reels]
            .filter(r => r.commentCount && r.commentCount > 0)
            .sort((a,b) => (b.commentCount || 0) - (a.commentCount || 0))
            .slice(0, 5)
            .map(r => ({
                label: r.title.substring(0, 40) + '...',
                value: r.commentCount || 0
            }));
    }, [reels]);

    const mostLikedReels = useMemo(() => {
        return [...reels]
            .filter(r => r.likeCount && r.likeCount > 0)
            .sort((a,b) => (b.likeCount || 0) - (a.likeCount || 0))
            .slice(0, 5)
            .map(r => ({
                label: r.title.substring(0, 40) + '...',
                value: r.likeCount || 0
            }));
    }, [reels]);

    const mostVotedPrompts = useMemo(() => {
        return [...prompts]
            .map(p => ({
                prompt: p,
                ratingCount: averageRatings[p.id]?.count || 0
            }))
            .filter(p => p.ratingCount > 0)
            .sort((a, b) => b.ratingCount - a.ratingCount)
            .slice(0, 5)
            .map(p => ({
                label: (p.prompt.title || p.prompt.text).substring(0, 40) + '...',
                value: p.ratingCount
            }));
    }, [prompts, averageRatings]);

    const mostViewedPrompts = useMemo(() => {
        return [...prompts]
            .filter(p => p.viewCount && p.viewCount > 0)
            .sort((a,b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, 5)
            .map(p => ({
                label: (p.title || p.text).substring(0, 40) + '...',
                value: p.viewCount || 0
            }));
    }, [prompts]);

    const mostLikedPrompts = useMemo(() => {
        return [...prompts]
            .filter(p => p.favoriteCount && p.favoriteCount > 0)
            .sort((a,b) => (b.favoriteCount || 0) - (a.favoriteCount || 0))
            .slice(0, 5)
            .map(p => ({
                label: (p.title || p.text).substring(0, 40) + '...',
                value: p.favoriteCount || 0
            }));
    }, [prompts]);

    // Icons for StatCards
    const icons = {
        prompts: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
        posts: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-600 dark:text-indigo-400"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" /></svg>,
        reels: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-600 dark:text-indigo-400"><path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.092 1.21-.138 2.43-.138 3.662s.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.092-1.21.138-2.43.138-3.662z" /></svg>,
        showcase: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-600 dark:text-indigo-400"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>,
        users: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 016-6h6a6 6 0 016 6v1h-3" /></svg>,
        categories: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
        reports: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H5a2 2 0 00-2 2zm0 0h7" /></svg>,
        pending: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    };

    const maxValueForActivity = useMemo(() => Math.max(...promptsLastXDays.map(d => d.value), 0), [promptsLastXDays]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={t('admin.analytics.totalPrompts')} value={totalPrompts} icon={icons.prompts} />
                <StatCard title={t('admin.analytics.totalPosts')} value={totalPosts} icon={icons.posts} />
                <StatCard title={t('admin.analytics.totalReels')} value={totalReels} icon={icons.reels} />
                <StatCard title={t('admin.analytics.totalShowcaseImages')} value={totalShowcaseImages} icon={icons.showcase} />
                <StatCard title={t('admin.analytics.totalUsers')} value={totalUsers} icon={icons.users} />
                <StatCard title={t('admin.analytics.totalCategories')} value={totalCategories} icon={icons.categories} />
                <StatCard title={t('admin.analytics.pendingReports')} value={pendingReports} icon={icons.reports} />
                <StatCard title={t('admin.analytics.pendingPrompts')} value={pendingPrompts} icon={icons.pending} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <BarChart title={t('admin.analytics.promptsPerCategory')} data={promptsPerCategory} />
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {isActivityChartExpanded ? t('admin.analytics.activityLast30Days') : t('admin.analytics.activityLast7Days')}
                        </h4>
                        <button
                            onClick={() => setIsActivityChartExpanded(!isActivityChartExpanded)}
                            className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            {isActivityChartExpanded ? t('common.collapse') : t('common.expand')}
                        </button>
                    </div>
                    {promptsLastXDays.length > 0 ? (
                        <div className="space-y-2">
                            {promptsLastXDays.map((item, index) => (
                                <div key={index} className="flex items-center gap-4">
                                    <div className="w-1/3 text-sm text-gray-600 dark:text-gray-300 truncate" title={item.label}>
                                        {item.label}
                                    </div>
                                    <div className="w-2/3 flex items-center gap-2">
                                        <div className="flex-grow bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                            <div
                                                className="bg-indigo-500 h-4 rounded-full"
                                                style={{ width: `${maxValueForActivity > 0 ? (item.value / maxValueForActivity) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                        <div className="w-10 text-right text-sm font-semibold text-gray-800 dark:text-gray-100">
                                            {item.value}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="flex-grow flex items-center justify-center h-full">
                            <p className="text-gray-500 dark:text-gray-400">{t('admin.analytics.noData')}</p>
                        </div>
                    )}
                </div>
                <BarChart title={t('admin.analytics.topContributors')} data={topContributors} />
                <BarChart title={t('admin.analytics.mostRemixedPrompts')} data={mostRemixed} />
                <BarChart title={t('admin.analytics.mostViewedPrompts')} data={mostViewedPrompts} />
                <BarChart title={t('admin.analytics.mostLikedPrompts')} data={mostLikedPrompts} />
                <BarChart title={t('admin.analytics.mostVotedPrompts')} data={mostVotedPrompts} />
                <BarChart title={t('admin.analytics.mostCommentedPrompts')} data={mostCommentedPrompts} />
                <BarChart title={t('admin.analytics.mostViewedPosts')} data={mostViewedPosts} />
                <BarChart title={t('admin.analytics.mostCommentedPosts')} data={mostCommentedPosts} />
                <BarChart title={t('admin.analytics.mostViewedReels')} data={mostViewedReels} />
                <BarChart title={t('admin.analytics.mostLikedReels')} data={mostLikedReels} />
                <BarChart title={t('admin.analytics.mostCommentedReels')} data={mostCommentedReels} />
            </div>
        </div>
    );
};

export default AdminAnalytics;
