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
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100]" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                <TransformWrapper 
                    initialScale={1} 
                    minScale={0.5} 
                    maxScale={5} 
                    centerOnInit={true}
                    wheel={{ step: 0.2 }}
                >
                    {({ zoomIn, zoomOut, resetTransform }) => (
                        <>
                            <div className="absolute top-4 right-4 z-50">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                                    className="text-white hover:text-gray-300 p-2 bg-black/30 rounded-full hover:bg-black/50 transition-colors"
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
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                </button>
                            </div>
                            <TransformComponent
                                wrapperStyle={{ width: '100%', height: '100%' }}
                                contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <img
                                    src={imageUrl}
                                    alt={t('promptCard.referenceImageTooltip')}
                                    className="max-w-[95vw] max-h-[90vh] object-contain"
                                    style={{ width: 'auto', height: 'auto' }}
                                />
                            </TransformComponent>
                        </>
                    )}
                </TransformWrapper>
            </div>
        </div>
    );
};

export default ReferenceImageViewer;