import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllShowcaseImages, getPrompts } from '../services/api';
import { ShowcaseImage, Prompt } from '../utils/types';
import Spinner from '../components/Spinner';
import { useLanguage } from '../context/LanguageContext';
import PhotoGalleryModal from '../components/PhotoGalleryModal';
import { transformCloudinaryUrl } from '../services/cloudinaryUtils';
// @ts-ignore
import { Link } from 'react-router-dom';

interface GalleryImage extends ShowcaseImage {
    promptText?: string;
    promptImageUrl?: string;
}

const ShowcasePage: React.FC = () => {
    const { t } = useLanguage();
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [galleryState, setGalleryState] = useState<{ open: boolean, index: number }>({ open: false, index: 0 });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [showcaseData, promptsResponse] = await Promise.all([
                    getAllShowcaseImages(),
                    getPrompts({ page: 1, limit: 10000, sortBy: 'newest' })
                ]);

                const promptsMap = new Map<string, Prompt>(promptsResponse.prompts.map(p => [p.id, p]));

                const enrichedImages: GalleryImage[] = showcaseData.map(image => ({
                    ...image,
                    promptText: promptsMap.get(image.promptId)?.text,
                    promptImageUrl: promptsMap.get(image.promptId)?.imageUrl
                }));

                setImages(enrichedImages);
            } catch (error) {
                console.error("Failed to fetch showcase data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <Spinner size="lg" />
                <p className="text-xl text-gray-700 dark:text-gray-300">{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <>
            {galleryState.open && (
                <PhotoGalleryModal
                    images={images}
                    startIndex={galleryState.index}
                    onClose={() => setGalleryState({ open: false, index: 0 })}
                />
            )}
            <div className="space-y-8 px-2 md:px-0">
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                        {t('showcasePage.title')}
                    </h1>
                    <p className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                        {t('showcasePage.subtitle')}
                    </p>
                </div>

                {images.length > 0 ? (
                    /* Masonry Layout using CSS Columns */
                    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4 mx-auto">
                        {images.map((image, index) => (
                            <div
                                key={image.id}
                                className="relative group cursor-pointer break-inside-avoid mb-4 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow"
                                onClick={() => setGalleryState({ open: true, index })}
                            >
                                <img
                                    src={transformCloudinaryUrl(image.imageUrl, 'w_600,c_limit,q_auto')}
                                    alt={`Showcase by ${image.username}`}
                                    className="w-full h-auto object-contain bg-gray-200 dark:bg-gray-700"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                    <div className="text-white w-full">
                                        <p className="text-xs font-medium mb-1 line-clamp-2 opacity-90">
                                            {image.promptText}
                                        </p>
                                        <p className="text-xs opacity-75">
                                            by <Link to={`/author/${image.userId}`} onClick={(e) => e.stopPropagation()} className="font-bold hover:underline text-white">{image.username}</Link>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <p className="text-gray-600 dark:text-gray-400">No showcase images have been uploaded yet.</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default ShowcasePage;