import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { useLanguage } from '../context/LanguageContext';
import Spinner from './Spinner';

interface ImageCropModalProps {
  imageSrc: string;
  onClose: () => void;
  onComplete: (file: File) => void;
  aspect?: number;
}

// This is a helper function to create a centered aspect crop
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}


const ImageCropModal: React.FC<ImageCropModalProps> = ({ imageSrc, onClose, onComplete, aspect }) => {
    const { t } = useLanguage();
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<Crop>();
    const imgRef = useRef<HTMLImageElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const linkId = 'react-image-crop-css';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/react-image-crop/dist/ReactCrop.css';
            document.head.appendChild(link);
        }
    }, []);

    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        if (aspect) {
            const { width, height } = e.currentTarget;
            setCrop(centerAspectCrop(width, height, aspect));
        }
    }

    const handleCropComplete = async () => {
        if (!completedCrop || !imgRef.current) {
            return;
        }
        setIsLoading(true);

        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio);
        canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio);

        const ctx = canvas.getContext('2d');

        if (!ctx) {
            setIsLoading(false);
            return;
        }

        ctx.scale(pixelRatio, pixelRatio);
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY
        );
        
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    setIsLoading(false);
                    return;
                }
                const croppedFile = new File([blob], "cropped_image.png", { type: "image/png" });
                onComplete(croppedFile);
            },
            'image/png',
            1
        );
    };

    const handleUploadOriginal = async () => {
        setIsLoading(true);
        fetch(imageSrc)
            .then(res => res.blob())
            .then(blob => {
                const originalFile = new File([blob], "original_image.png", { type: blob.type });
                onComplete(originalFile);
            }).catch(e => {
                console.error("Could not convert data URL to file", e);
                setIsLoading(false);
            });
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[90vh] relative flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('modals.crop.title')}</h2>
                    <button onClick={onClose} disabled={isLoading} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-grow p-4 flex justify-center bg-gray-100 dark:bg-gray-900 overflow-auto">
                    <div>
                        <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            onComplete={c => setCompletedCrop(c)}
                            aspect={aspect}
                            minWidth={100}
                            minHeight={100}
                        >
                            <img
                                ref={imgRef}
                                alt="Crop me"
                                src={imageSrc}
                                onLoad={onImageLoad}
                                style={{ maxHeight: '70vh' }}
                            />
                        </ReactCrop>
                    </div>
                </div>
                <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4">
                     {isLoading && <Spinner />}
                    <button onClick={handleUploadOriginal} disabled={isLoading} className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        {t('modals.crop.uploadOriginal')}
                    </button>
                    <button onClick={handleCropComplete} disabled={isLoading || !completedCrop?.width || !completedCrop?.height} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                        {t('modals.crop.cropAndUpload')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ImageCropModal;