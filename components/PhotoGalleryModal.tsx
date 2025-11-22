import React, { useState, useEffect, useCallback } from 'react';
import { ShowcaseImage } from '../types';
import Spinner from './Spinner';
import { Link } from 'react-router-dom';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface GalleryImage extends ShowcaseImage {
    promptText?: string;
}

interface PhotoGalleryModalProps {
  images: GalleryImage[];
  startIndex: number;
  onClose: () => void;
}

const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({ images, startIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isImageLoading, setIsImageLoading] = useState(true);

  const goToNext = useCallback(() => {
    setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
    setIsImageLoading(true);
  }, [images.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prevIndex => (prevIndex - 1 + images.length) % images.length);
    setIsImageLoading(true);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goToNext, goToPrev, onClose]);

  const currentImage = images[currentIndex];

  if (!currentImage) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[90]" onClick={onClose} role="dialog" aria-modal="true">
      <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-50 p-2 bg-black/30 rounded-full"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goToPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-50 p-3 bg-black/30 rounded-full"
            aria-label="Previous image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {/* Image Display */}
         <TransformWrapper centerOnInit={true}>
            {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                    <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
                        <button onClick={(e) => { e.stopPropagation(); zoomIn(); }} className="p-2 bg-black/30 text-white rounded-full hover:bg-black/50" title="Zoom In">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3h-6" /></svg>
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); zoomOut(); }} className="p-2 bg-black/30 text-white rounded-full hover:bg-black/50" title="Zoom Out">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); resetTransform(); }} className="p-2 bg-black/30 text-white rounded-full hover:bg-black/50" title="Reset View">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                       </button>
                    </div>
                    <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center justify-center">
                        {isImageLoading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Spinner size="lg" />
                            </div>
                        )}
                        <TransformComponent
                            wrapperStyle={{ width: '100%', height: '100%' }}
                            contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <img
                                src={currentImage.imageUrl}
                                alt={`Showcase by ${currentImage.username}`}
                                className={`transition-opacity duration-300 max-w-full max-h-full object-contain ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                                onLoad={() => setIsImageLoading(false)}
                                onError={() => setIsImageLoading(false)}
                            />
                        </TransformComponent>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white text-sm">
                            {currentImage.promptText && (
                                <p className="mb-2 text-xs italic line-clamp-2">
                                    "{currentImage.promptText}"
                                </p>
                            )}
                            <p>
                                By <Link to={`/author/${currentImage.userId}`} onClick={onClose} className="font-semibold hover:underline">{currentImage.username}</Link> on {new Date(currentImage.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </>
            )}
        </TransformWrapper>


        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-50 p-3 bg-black/30 rounded-full"
            aria-label="Next image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default PhotoGalleryModal;