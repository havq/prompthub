
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Prompt, UserProfile, Category, BannerAdSettings, PromptTextEntry } from '../../utils/types';
import { useLanguage } from '../../context/LanguageContext';
import { buildUrl } from '../../utils/permalinks';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import { formatCount } from './utils';
import StarRating from '../StarRating';
//import CopyPromptButton from '../CopyPromptButton';
import BannerAd from '../BannerAd';
import ShareButton from '../ShareButton';

interface PromptInfoProps {
    prompt: Prompt;
    author: UserProfile | null;
    categories: Category[];
    averageRating: number;
    ratingCount: number;
    userRating: number;
    isFavorite: boolean;
    showcaseCount: number;
    onRate: (rating: number) => void;
    onToggleFavorite: () => void;
    onFindSimilar: () => void;
    onRemix: () => void;
    onReport: () => void;
    onClose: () => void;
    showCopyButtonSetting: boolean;
    showRemixButtonSetting: boolean;
    promptDetailAdSettings?: BannerAdSettings;
    onAddToCollection?: () => void;
    onRemoveFromCollection?: () => void;
}

const PromptInfo: React.FC<PromptInfoProps> = ({
    prompt,
    author,
    categories,
    averageRating,
    ratingCount,
    userRating,
    isFavorite,
    showcaseCount,
    onRate,
    onToggleFavorite,
    onFindSimilar,
    onRemix,
    onReport,
    onClose,
    showCopyButtonSetting,
    showRemixButtonSetting,
    promptDetailAdSettings,
    onAddToCollection,
    onRemoveFromCollection
}) => {
    const { t } = useLanguage();
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeLangIndex, setActiveLangIndex] = useState(0);
    const [isCopied, setIsCopied] = useState(false);

    // State for responsive tabs
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const promptTexts = useMemo((): PromptTextEntry[] => {
        if (!prompt.text) return [{ lang: 'Default', text: '' }];
        try {
            const parsed = JSON.parse(prompt.text);
            if (Array.isArray(parsed) && parsed.length > 0 && 'lang' in parsed[0] && 'text' in parsed[0]) {
                return parsed;
            }
        } catch (e) {
            // Not a JSON string, treat as plain text
        }
        return [{ lang: 'Default', text: prompt.text }];
    }, [prompt.text]);

    const currentTextEntry = promptTexts[activeLangIndex] || promptTexts[0] || { lang: 'Default', text: '' };
    const text = currentTextEntry.text;
    const TEXT_LIMIT = 350;
    const isLongText = text.length > TEXT_LIMIT;

    const handleCopy = () => {
        if (isCopied) return;
        navigator.clipboard.writeText(text).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };

    const promptCategories = (prompt.categoryIds || [])
        .map((id) => categories.find((f) => f.id === id))
        .filter((f): f is Category => f !== undefined);


    const renderTabs = () => {
        if (promptTexts.length <= 1) return null;
    
        const limit = isMobile ? 2 : 3;
        const visibleTabs = promptTexts.slice(0, limit);
        const dropdownTabs = promptTexts.slice(limit);
    
        const isDropdownTabActive = activeLangIndex >= limit;
        const dropdownButtonText = isDropdownTabActive ? promptTexts[activeLangIndex].lang : 'More';
    
        return (
            <div className="border-b border-gray-200 dark:border-gray-700 mb-2">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    {visibleTabs.map((entry, index) => (
                        <button
                            key={`${entry.lang}-${index}`}
                            onClick={() => setActiveLangIndex(index)}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeLangIndex === index
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            {entry.lang}
                        </button>
                    ))}
    
                    {dropdownTabs.length > 0 && (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`flex items-center gap-1 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    isDropdownTabActive
                                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                <span>{dropdownButtonText}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                            {isDropdownOpen && (
                                <div className="origin-top-left absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                                    <div className="py-1">
                                        {dropdownTabs.map((entry, index) => {
                                            const actualIndex = index + limit;
                                            return (
                                                <button
                                                    key={`${entry.lang}-${actualIndex}`}
                                                    onClick={() => {
                                                        setActiveLangIndex(actualIndex);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left block px-4 py-2 text-sm ${
                                                        activeLangIndex === actualIndex ? 'bg-gray-100 dark:bg-gray-700 font-semibold' : ''
                                                    } text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700`}
                                                >
                                                    {entry.lang}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </nav>
            </div>
        );
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white break-words pr-8">{prompt.title}</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    {author ? (
                        <Link to={buildUrl('author', { authorId: author.uid })} className="flex items-center group" onClick={onClose}>
                            <img src={transformCloudinaryUrl(author.photoURL || '', 'w_100,h_100,c_fill,g_auto') || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(author.username)}`} alt={author.username} className="h-10 w-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700" />
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{author.username}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('common.by')}</p>
                            </div>
                        </Link>
                    ) : (
                        <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold">?</div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Unknown</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('common.by')}</p>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="text-right">
                        <StarRating rating={averageRating} userRating={userRating} onRate={onRate} />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatCount(ratingCount)} {t('promptDetail.ratings')}</p>
                    </div>
                </div>
            </div>

            {renderTabs()}
            <div className="relative bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-sm leading-relaxed select-text font-mono pb-8">
                    {isLongText && !isExpanded ? `${text.substring(0, TEXT_LIMIT)}...` : text}
                </p>
                <div className="absolute bottom-2 left-4 right-4 flex justify-between items-center">
                    {isLongText ? (
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)} 
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none"
                        >
                            {isExpanded ? t('common.collapse') : t('common.expand')}
                        </button>
                    ) : (
                        <div /> // Placeholder to keep the copy button on the right
                    )}
                    <button
                        onClick={handleCopy}
                        className="p-2 rounded-md bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-colors"
                        title={isCopied ? t('common.copied') : t('common.copyPrompt')}
                    >
                        {isCopied ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
            
            {
                /*
                    {showCopyButtonSetting && (
                        <div className="mb-6">
                            <CopyPromptButton textToCopy={text} className="w-full" />
                        </div>
                    )}
                */
            }

            {prompt.promptNote && (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 mb-4 rounded-r-md">
                    <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200 mb-1">Notes / Instructions</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">{prompt.promptNote}</p>
                </div>
            )}

            {prompt.promptSource && (
                <div className="bg-gray-100 dark:bg-gray-700/30 p-3 mb-4 rounded-md flex items-center gap-2 overflow-hidden">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex-shrink-0">Source:</span>
                    <a href={prompt.promptSource} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline truncate block flex-1">
                        {prompt.promptSource}
                    </a>
                </div>
            )}

            {promptCategories && promptCategories.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                    {promptCategories.map(cat => (
                        <Link
                            key={cat.id}
                            to={buildUrl('promptCategory', { categoryId: cat.id })}
                            onClick={onClose}
                            className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                        >
                            {cat.name}
                        </Link>
                    ))}
                </div>
            )}

            {prompt.tags && prompt.tags.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('home.tags')}</h4>
                    <div className="flex flex-wrap gap-2">
                        {prompt.tags.map(tag => (
                            <Link
                                key={tag}
                                to={buildUrl('tag', { tag: tag })}
                                onClick={onClose}
                                className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                #{tag}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-2 mb-6">
                <button onClick={onToggleFavorite} className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${isFavorite ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                    </svg>
                    <span className="text-xs font-medium">{t('promptDetail.favorite')}</span>
                </button>
                
                <button onClick={onFindSimilar} className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-xs font-medium">{t('promptDetail.similar')}</span>
                </button>
                
                <ShareButton
                    prompt={prompt}
                    className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full h-full"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 mb-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                    </svg>
                    <span className="text-xs font-medium">{t('common.share')}</span>
                </ShareButton>

                {onAddToCollection && (
                     <button onClick={onAddToCollection} className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6 mb-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                        </svg>
                        <span className="text-xs font-medium">{t('promptCard.saveToCollection')}</span>
                    </button>
                )}

                {onRemoveFromCollection && (
                     <button onClick={onRemoveFromCollection} className="flex flex-col items-center justify-center p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6 mb-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <span className="text-xs font-medium">{t('promptCard.removeFromCollection')}</span>
                    </button>
                )}

                {showRemixButtonSetting && (
                    <button onClick={onRemix} className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        <span className="text-xs font-medium">{t('promptDetail.remix')}</span>
                    </button>
                )}

                <button onClick={onReport} className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-xs font-medium">{t('promptDetail.report')}</span>
                </button>
            </div>

            {promptDetailAdSettings?.enabled && promptDetailAdSettings.adCode && (
                <div className="my-6">
                    <BannerAd adCode={promptDetailAdSettings.adCode} />
                </div>
            )}
        </div>
    );
};

export default PromptInfo;
