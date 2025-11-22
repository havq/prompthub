import React, { useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface BannerAdProps {
  adCode: string;
  className?: string;
  onClose?: () => void;
}

const BannerAd: React.FC<BannerAdProps> = ({ adCode, className = '', onClose }) => {
    const { t } = useLanguage();
    const adContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (adContainerRef.current) {
            const container = adContainerRef.current;
            container.innerHTML = ''; // Clear previous content

            const fragment = document.createRange().createContextualFragment(adCode);
            container.appendChild(fragment);

            const scripts = container.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                for (const attr of oldScript.attributes) {
                    newScript.setAttribute(attr.name, attr.value);
                }
                if (oldScript.innerHTML) {
                    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                }
                oldScript.parentNode?.replaceChild(newScript, oldScript);
            });
        }
    }, [adCode]);

    return (
        <div className={`relative w-full flex justify-center my-6 ${className}`}>
            <div className="relative bg-gray-100 dark:bg-gray-800/50 rounded-lg shadow-inner flex flex-col h-full border border-dashed border-gray-300 dark:border-gray-700 w-full p-4 items-center justify-center text-center min-h-[100px]">
                {onClose && (
                    <button 
                        onClick={onClose} 
                        className="absolute top-1 right-1 z-10 p-1 bg-gray-300/50 dark:bg-gray-900/50 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-400/50 dark:hover:bg-gray-700/50"
                        aria-label="Close Ad"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                )}
                <div ref={adContainerRef} className="w-full flex justify-center items-center" />
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-2 tracking-widest uppercase">{t('adCard.advertisement')}</span>
            </div>
        </div>
    );
};

export default BannerAd;