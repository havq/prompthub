import React from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useLanguage } from '../../context/LanguageContext';

interface ReferenceImageViewerProps {
    isOpen: boolean;
    imageUrl?: string;
    onClose: () => void;
}

const ReferenceImageViewer: React.FC<ReferenceImageViewerProps> = ({ isOpen, imageUrl, onClose }) => {
    const { t } = useLanguage();
    
    if (!isOpen || !imageUrl) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <TransformWrapper initialScale={1} centerOnInit={true}>
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        <div className="absolute top-4 right-4 z-50">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className="text-white hover:text-gray-300 p-2 bg-black/30 rounded-full"
                                aria-label="Close image viewer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
                            <button onClick={(e) => {e.stopPropagation(); zoomIn();}} className="p-2 bg-black/30 text-white rounded-full hover:bg-black/50" title="Zoom In">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3h-6" /></svg>
                            </button>
                            <button onClick={(e) => {e.stopPropagation(); zoomOut();}} className="p-2 bg-black/30 text-white rounded-full hover:bg-black/50" title="Zoom Out">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
                            </button>
                            <button onClick={(e) => {e.stopPropagation(); resetTransform();}} className="p-2 bg-black/30 text-white rounded-full hover:bg-black/50" title="Reset View">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                </svg>
                            </button>
                        </div>
                        <TransformComponent
                            wrapperProps={{
                                onClick: (e: React.MouseEvent) => e.stopPropagation(),
                                className: "w-full h-full flex items-center justify-center"
                            }}
                        >
                            <img
                                src={imageUrl}
                                alt={t('promptDetail.referenceImageLabel')}
                                className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                            />
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>
        </div>
    );
};

export default ReferenceImageViewer;
