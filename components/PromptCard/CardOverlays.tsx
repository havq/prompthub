
import React from 'react';
import { Prompt, Category } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import ShareButton from '../ShareButton';
import { PromptCardProps } from './types';

interface CardOverlaysProps extends PromptCardProps {
    isMediaReady: boolean;
    mediaError: boolean;
    categories: Category[];
    onOpenReferenceImage: () => void;
}

const CardOverlays: React.FC<CardOverlaysProps> = ({ 
    prompt, isMediaReady, mediaError, isFavorite, onToggleFavorite, 
    onFindSimilar, onAddToCollection, onRemoveFromCollection, 
    onUploadShowcase, onEdit, onDelete, canManage, 
    categories, onCategoryClick, onOpenReferenceImage 
}) => {
    const { t } = useLanguage();

    const promptCategories = (prompt.categoryIds || [])
        .map((id) => categories.find((f) => f.id === id))
        .filter((f): f is Category => f !== undefined);

    if (!isMediaReady || mediaError) return null;

    return (
        <>
            {/* Top Right Actions (Management) */}
            <div className="absolute top-2 right-2 z-40 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                {onRemoveFromCollection && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemoveFromCollection(); }}
                        className="p-1.5 bg-red-600/80 text-white rounded-full hover:bg-red-700/90 transition-colors backdrop-blur-sm pointer-events-auto"
                        title={t('promptCard.removeFromCollection')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
                {canManage && (
                    <>
                        <button onClick={(e) => { e.stopPropagation(); onEdit(prompt); }} className="p-1.5 bg-gray-900/60 text-white rounded-full hover:bg-blue-600/80 backdrop-blur-sm pointer-events-auto" title={t('common.edit')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(prompt); }} className="p-1.5 bg-gray-900/60 text-white rounded-full hover:bg-red-600/80 backdrop-blur-sm pointer-events-auto" title={t('common.delete')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                    </>
                )}
            </div>

            {/* Top Left Badges */}
            <div className="absolute top-2 left-2 flex items-center gap-2 z-10 pointer-events-none">
                {prompt.remixedFrom && (
                    <div className="bg-purple-600/80 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /><path d="M3 10a7 7 0 0111.94-4.95l1.103-1.104a1 1 0 011.414 1.414l-1.104 1.103A7 7 0 113 10zm11.495-2.553a1 1 0 01-1.414-1.414l1.104-1.103a5 5 0 10-7.072 7.072l-1.103 1.103a1 1 0 01-1.414-1.414l1.103-1.103a5 5 0 007.072-7.072z" /></svg>
                        <span>{t('promptCard.remix')}</span>
                    </div>
                )}
                {prompt.isPrivate && (
                    <div className="bg-gray-800/60 text-white p-1.5 rounded-full backdrop-blur-sm" title="Private Prompt">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </div>
            
            {/* NSFW Badge - Top Right */}
            {prompt.isNSFW && (
                <div className="absolute top-2 right-2 z-20 pointer-events-none">
                     <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm backdrop-blur-sm">NSFW</span>
                </div>
            )}

            {/* Bottom Right Categories */}
            <div className="absolute bottom-2 right-2 flex flex-wrap items-center gap-1 z-10 pointer-events-none">
                {promptCategories.map(category => (
                    <button
                        key={category.id}
                        onClick={onCategoryClick ? (e) => { e.stopPropagation(); onCategoryClick(category.id); } : undefined}
                        disabled={!onCategoryClick}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-black/50 text-white backdrop-blur-sm transition-colors ${onCategoryClick ? 'hover:bg-black/70 cursor-pointer pointer-events-auto' : 'cursor-default'}`}
                    >
                        {category.name}
                    </button>
                ))}
            </div>

            {/* Bottom Left Reference Image */}
            {prompt.referenceImageUrl && (
                <button
                    onClick={(e) => { e.stopPropagation(); onOpenReferenceImage(); }}
                    className="absolute bottom-2 left-2 z-10 w-16 h-20 rounded-md overflow-hidden border-2 border-white/50 shadow-lg group-hover:scale-110 group-hover:border-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 pointer-events-auto"
                    title={t('promptCard.referenceImageTooltip')}
                >
                    <img 
                        src={transformCloudinaryUrl(prompt.referenceImageUrl, 'w_60,h_80,c_fill,g_auto') || prompt.referenceImageUrl} 
                        alt={t('promptCard.referenceImageTooltip')}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                </button>
            )}

            {/* Main Action Overlay (Hover) */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-2 z-30 pointer-events-none">
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(prompt); }}
                    className={`p-2 rounded-full transition-colors pointer-events-auto ${isFavorite ? 'bg-red-500/80 text-white' : 'bg-gray-900/60 text-gray-300 hover:bg-red-500/80 hover:text-white'}`}
                    title={isFavorite ? t('promptCard.removeFromFavorites') : t('promptCard.addToFavorites')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onAddToCollection(prompt); }}
                    className="p-2 rounded-full bg-gray-900/60 text-gray-300 hover:bg-blue-600/80 hover:text-white transition-colors pointer-events-auto"
                    title={t('promptCard.saveToCollection')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>
                </button>
                <ShareButton prompt={prompt} className="p-2 rounded-full bg-gray-900/60 text-gray-300 hover:bg-green-600/80 hover:text-white transition-colors pointer-events-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" /></svg>
                </ShareButton>
                <button onClick={(e) => { e.stopPropagation(); onFindSimilar(prompt); }} className="p-2 rounded-full bg-gray-900/60 text-gray-300 hover:bg-indigo-600/80 hover:text-white transition-colors pointer-events-auto" title={t('promptCard.findSimilar')}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
            </div>
        </>
    );
};

export default CardOverlays;
