
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface MediaPreviewProps {
    imageUrl: string;
    videoUrl: string;
    referenceImageUrl: string;
    rotation: number;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({ imageUrl, videoUrl, referenceImageUrl, rotation }) => {
    const { t } = useLanguage();

    if (!imageUrl && !videoUrl && !referenceImageUrl) return null;

    return (
        <div className="flex gap-4 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
            {(imageUrl || videoUrl) && (
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Result Preview</label>
                    <div className="h-40 w-40 object-cover rounded-md border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                        {videoUrl ? (
                            <video src={videoUrl} poster={imageUrl} controls className="max-h-full max-w-full" />
                        ) : imageUrl ? (
                            <img 
                                src={imageUrl} 
                                alt="Result Preview" 
                                className={`max-h-full max-w-full transition-transform duration-300 ${rotation === 90 ? 'rotate-90' : rotation === -90 ? '-rotate-90' : ''}`} 
                            />
                        ) : null}
                    </div>
                </div>
            )}
            {referenceImageUrl && (
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reference Image Preview</label>
                    <div className="h-40 w-40 object-cover rounded-md border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                        <img src={referenceImageUrl} alt="Reference Preview" className="max-h-full max-w-full" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaPreview;
