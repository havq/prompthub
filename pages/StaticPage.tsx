
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useParams, useNavigate } from 'react-router-dom';
import { getStaticPages } from '../services/api';
import { StaticPage as StaticPageType } from '../utils/types';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { sanitizeHtml } from '../utils/sanitize';

const StaticPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [page, setPage] = useState<StaticPageType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();

    useEffect(() => {
        const fetchPage = async () => {
            setIsLoading(true);
            setError('');
            try {
                const pages = await getStaticPages();
                const foundPage = pages.find(p => p.slug === slug);
                if (foundPage) {
                    setPage(foundPage);
                } else {
                    setError('Page not found.');
                }
            } catch (err) {
                console.error("Failed to fetch static page:", err);
                setError('Failed to load page content.');
            } finally {
                setIsLoading(false);
            }
        };

        if (slug) {
            fetchPage();
        }
    }, [slug]);

    useEffect(() => {
        if (!page) return;

        const originalTitle = document.title;
        const originalDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
        const originalKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content');

        const setMetaTag = (name: string, content: string) => {
            let element = document.querySelector(`meta[name="${name}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute('name', name);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        const removeMetaTag = (name: string) => {
            const element = document.querySelector(`meta[name="${name}"]`);
            if (element) {
                document.head.removeChild(element);
            }
        };

        document.title = `${page.title} | ${t('header.title')}`;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = page.content;
        const description = ((tempDiv.textContent || tempDiv.innerText || '').substring(0, 160).trim() + '...').replace(/\s\s+/g, ' ');
        setMetaTag('description', description);
        
        removeMetaTag('keywords');

        return () => {
            document.title = originalTitle;
            if (originalDescription) {
                setMetaTag('description', originalDescription);
            } else {
                removeMetaTag('description');
            }
             if (originalKeywords) {
                setMetaTag('keywords', originalKeywords);
            }
        };
    }, [page, t]);

    const handleEdit = () => {
        if (page) {
            navigate('/admin', { state: { action: 'edit-page', pageId: page.id } });
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Spinner size="lg" />
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="text-center py-20">
                <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">Error</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
            </div>
        );
    }
    
    const displayDate = page.updatedAt || page.createdAt;
    const dateLabelKey = page.updatedAt ? 'staticPage.updatedOn' : 'staticPage.publishedOn';
    const formattedDate = new Date(displayDate).toLocaleDateString('en-GB');

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-4xl mx-auto relative">
            {isAdmin && (
                <button 
                    onClick={handleEdit}
                    className="absolute top-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm"
                >
                    {t('common.edit')}
                </button>
            )}
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2 pr-24">{page.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                {t(dateLabelKey, { date: formattedDate })}
            </p>
            <div
                className="prose prose-lg dark:prose-invert max-w-none prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-headings:font-bold prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-900/50 prose-ul:list-disc prose-ul:marker:text-indigo-500"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
            />
        </div>
    );
};

export default StaticPage;
