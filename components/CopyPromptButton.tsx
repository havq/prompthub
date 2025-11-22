import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface CopyPromptButtonProps {
    textToCopy: string;
    className?: string;
}

const CopyPromptButton: React.FC<CopyPromptButtonProps> = ({ textToCopy, className }) => {
    const { t } = useLanguage();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const safeTextToCopy = String(textToCopy || '');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCopy = (text: string, type: string) => {
        const copyPromise = navigator.clipboard ? navigator.clipboard.writeText(text) : new Promise<void>((resolve, reject) => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'absolute';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                resolve();
            } catch (err) {
                reject(err);
            } finally {
                document.body.removeChild(textArea);
            }
        });

        copyPromise.then(() => {
            setCopyStatus(type);
            setIsMenuOpen(false);
            setTimeout(() => setCopyStatus(null), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy text.');
        });
    };

    const copyOptions = [
        { name: 'Midjourney', params: '--ar 16:9 --v 6' },
        { name: 'Stable Diffusion', params: 'masterpiece, best quality,' },
    ];

    return (
        <div className={`relative inline-block text-left ${className || ''}`} ref={menuRef}>
            <div className={`flex rounded-md shadow-sm ${className ? 'w-full' : ''}`}>
                <button
                    type="button"
                    onClick={() => handleCopy(safeTextToCopy, 'prompt')}
                    className={`inline-flex items-center justify-center px-2 py-2 border border-transparent text-sm font-medium rounded-l-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-indigo-500 ${className ? 'flex-grow' : ''}`}
                >
                    {copyStatus === 'prompt' ? t('common.copied') : t('common.copyPrompt')}
                </button>
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="-ml-px relative inline-flex items-center px-2 py-2 rounded-r-md border border-indigo-700 bg-indigo-700 text-sm font-medium text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-indigo-500"
                    aria-haspopup="true"
                    aria-expanded={isMenuOpen}
                >
                    <span className="sr-only">Open options</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
            {isMenuOpen && (
                <div className="origin-bottom-right absolute -right-15 bottom-full mb-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-950 ring-1 ring-black ring-opacity-5 z-20">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        {copyOptions.map(option => (
                             <button
                                key={option.name}
                                onClick={() => handleCopy(option.name === 'Stable Diffusion' ? `${option.params} ${safeTextToCopy}` : `${safeTextToCopy} ${option.params}`, option.name)}
                                className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                role="menuitem"
                            >
                                {copyStatus === option.name 
                                    ? t('common.copied') 
                                    : t('promptCard.copyFor', { tool: option.name })
                                }
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CopyPromptButton;