
import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getSettings } from '../../services/settingsService';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import { buildUrl } from '../../utils/permalinks';
import StarRating from '../StarRating';
import CopyPromptButton from '../CopyPromptButton';
import { PromptCardProps } from './types';
import { formatCount } from './utils';

const CardContent: React.FC<PromptCardProps> = ({
    prompt,
    userRating,
    onRate,
    averageRating,
    ratingCount,
    commentCount,
    showcaseCount,
    viewCount,
    onTagClick,
    onRemix,
    onUploadShowcase,
    viewMode,
}) => {
    const { t } = useLanguage();
    const { promptCardSettings } = getSettings();
    const showViewCountSetting = promptCardSettings?.showViewCount ?? true;
    const showShowcaseCountSetting = promptCardSettings?.showShowcaseCount ?? true;
    const showCommentCountSetting = promptCardSettings?.showCommentCount ?? true;
    const showRemixCountSetting = promptCardSettings?.showRemixCount ?? true;
    const showRatingsSetting = promptCardSettings?.showRatings ?? true;
    const showCopyButtonSetting = promptCardSettings?.showCopyButton ?? true;
    const showRemixButtonSetting = promptCardSettings?.showRemixButton ?? true;

    // In list mode, the parent PromptCard already provides padding.
    // In grid/compact mode, CardContent provides the padding.
    const contentPadding = viewMode === 'list' ? 'py-0 pl-0' : 'p-4';

    return (
        <div className={`${contentPadding} flex flex-col flex-grow min-w-0`}>
            <h3 className={`text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 truncate-2-lines ${viewMode !== 'list' ? 'min-h-[38px]' : ''}`}>
                {prompt.title}
            </h3>

            {/*
            {prompt.tags && prompt.tags.length > 0 && (
                <div className={`flex flex-wrap gap-1.5 mb-3 ${viewMode === 'list' ? 'hidden md:flex' : 'flex'}`}>
                    {prompt.tags.slice(0, 4).map((tag) => (
                        <button
                            key={tag}
                            onClick={onTagClick ? (e) => { e.stopPropagation(); onTagClick(tag); } : undefined}
                            className={`px-2 py-0.5 text-[11px] font-medium rounded-md border transition-colors ${
                                onTagClick
                                    ? 'bg-gray-100 dark:bg-[#1c1f26] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer'
                                    : 'bg-gray-100 dark:bg-[#1c1f26] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 cursor-default'
                            }`}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            )}
            */}

            <div className={`mt-auto pt-3 border-t border-gray-200 dark:border-gray-700/50`}>
                {showRatingsSetting && (
                    <div className="flex items-center justify-between mb-2">
                        <div onClick={(e) => e.stopPropagation()}>
                            <StarRating rating={averageRating} userRating={userRating} onRate={(newRating) => onRate(prompt, newRating)} />
                        </div>
                        {ratingCount > 0 && (
                            <div className="text-xs text-yellow-500 dark:text-yellow-400 flex items-center">
                                <span>{averageRating.toFixed(1)}</span>
                                <span className="text-gray-500 dark:text-gray-400 ml-1">({formatCount(ratingCount)})</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2 min-h-[20px]">
                    <div className="truncate flex-grow mr-2">
                        {prompt.authorId && prompt.authorName ? (
                            <Link
                                to={buildUrl('author', { authorId: prompt.authorId })}
                                onClick={(e) => { e.stopPropagation(); }}
                                className="text-xs hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors group flex items-center gap-2"
                            >
                                <img
                                    src={transformCloudinaryUrl(prompt.authorPhotoURL || '', 'w_40,h_40,c_fill,g_auto') || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(prompt.authorName)}&size=32`}
                                    alt={prompt.authorName}
                                    className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                                    loading="lazy"
                                />
                                <span className="truncate">
                                    {/*{t('common.by')}{' '}*/}
                                    <span className="font-semibold group-hover:underline">{prompt.authorName}</span>
                                </span>
                            </Link>
                        ) : (
                            <span>&nbsp;</span>
                        )}
                    </div>

                    <div className={`items-center gap-3 flex-shrink-0 ${viewMode === 'list' ? 'hidden md:flex' : 'flex'}`}>
                        {showViewCountSetting && (
                            <div className="flex items-center gap-1" title={`${(viewCount || 0).toLocaleString()} views`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>{formatCount(viewCount)}</span>
                            </div>
                        )}
                        {showShowcaseCountSetting && (
                            <button onClick={(e) => { e.stopPropagation(); onUploadShowcase(prompt); }} className="flex items-center gap-1 hover:text-indigo-500" title={t('promptCard.uploadShowcase')}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                    <path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                                </svg>
                                <span>{formatCount(showcaseCount)}</span>
                            </button>
                        )}
                        {showCommentCountSetting && (
                            <div className="flex items-center gap-1" title={t('promptCard.commentsCount', { count: commentCount })}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <span>{formatCount(commentCount)}</span>
                            </div>
                        )}
                        {showRemixCountSetting && (
                            <div className="flex items-center gap-1" title={t('promptCard.remixesCount', { count: prompt.remixCount || 0 })}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                    <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.633-.632l-.183-.551Z" />
                                </svg>
                                <span>{formatCount(prompt.remixCount)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {(showRemixButtonSetting || showCopyButtonSetting) && (
                    <div className={`items-center gap-2 ${showCopyButtonSetting && showRemixButtonSetting ? 'justify-between' : 'justify-start w-full'} ${viewMode === 'list' ? 'hidden md:flex' : 'flex'}`}>
                        {showRemixButtonSetting && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemix(prompt); }}
                                title={t('promptCard.remixPrompt')}
                                className={`text-center bg-gray-100 dark:bg-[#1c1f26] hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 font-medium py-2.5 px-3 rounded-md transition-colors text-xs ${!showCopyButtonSetting ? 'w-full' : ''}`}
                            >
                                {t('promptCard.remix')}
                            </button>
                        )}
                        {showCopyButtonSetting && (
                            <div onClick={e => e.stopPropagation()} className={showRemixButtonSetting ? 'flex-1' : 'w-full'}>
                                <CopyPromptButton textToCopy={prompt.text} className="w-full text-xs py-1.5 font-medium" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CardContent;
