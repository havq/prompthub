import React from 'react';
import { ShowcaseImage } from '../../utils/types';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import { useLanguage } from '../../context/LanguageContext';

interface GalleryImage extends ShowcaseImage {
    promptText?: string;
}

interface UserShowcaseProps {
    images: GalleryImage[];
    setGalleryState: (state: { open: boolean, index: number }) => void;
    onDelete: (id: string) => void;
    isOwner: boolean;
    username: string;
}

const UserShowcase: React.FC<UserShowcaseProps> = ({ images, setGalleryState, onDelete, isOwner, username }) => {
    const { t } = useLanguage();
    
    if (images.length === 0) {
        return (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
                <p className="text-gray-600 dark:text-gray-400">
                    {isOwner ? t('profile.noShowcase') : t('authorPage.noShowcase', { authorName: username })}
                </p>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((image, index) => {
                const thumbnailUrl = transformCloudinaryUrl(image.imageUrl, 'w_300,h_350,c_fill,g_auto');
                return (
                    <div key={image.id} className="relative group aspect-square">
                        <div className="cursor-pointer" onClick={() => setGalleryState({ open: true, index })}>
                            <img src={thumbnailUrl} alt={`Showcase by ${image.username}`} className="w-full h-full object-cover rounded-md bg-gray-200 dark:bg-gray-700 transition-transform duration-300 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                                <p className="text-white text-xs text-center line-clamp-3">{image.promptText}</p>
                            </div>
                        </div>
                        {isOwner && (
                            <button onClick={(e) => { e.stopPropagation(); onDelete(image.id); }} className="absolute top-1.5 right-1.5 p-1.5 bg-red-600/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500" title={t('common.delete')} aria-label="Delete showcase image">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default UserShowcase;