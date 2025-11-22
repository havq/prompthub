import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { UploadMethod } from '../../types';
import Spinner from '../Spinner';
import CircularProgress from '../CircularProgress';

interface MediaInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    onFileSelected: (file: File, method?: UploadMethod) => void;
    uploadOptions: UploadMethod[];
    isUploading: boolean;
    uploadProgress?: number;
    placeholder?: string;
    required?: boolean;
    accept?: string;
    disabled?: boolean;
    INPUT_STYLE: string;
}

const MediaInput: React.FC<MediaInputProps> = ({
    id, label, value, onChange, onFileSelected, uploadOptions, isUploading, uploadProgress = 0,
    placeholder, required, accept = "image/*", disabled, INPUT_STYLE
}) => {
    const { t } = useLanguage();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleUploadClick = (method?: UploadMethod) => {
        fileInputRef.current?.setAttribute('data-method', method || '');
        fileInputRef.current?.click();
        setIsDropdownOpen(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const methodOverride = e.target.getAttribute('data-method') as UploadMethod || undefined;
        if (file) {
            onFileSelected(file, methodOverride);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <div className="mt-1 flex items-center gap-2">
                <input
                    type="text"
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`flex-grow ${INPUT_STYLE}`}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                />
                {uploadOptions.length > 0 && !disabled && (
                    <div ref={dropdownRef} className="relative inline-block text-left flex-shrink-0">
                        <div className="flex rounded-md shadow-sm">
                            <button 
                                type="button" 
                                onClick={() => handleUploadClick()} 
                                disabled={isUploading} 
                                className="relative inline-flex items-center justify-center min-w-[80px] space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 rounded-l-md"
                            >
                                {isUploading ? <CircularProgress progress={uploadProgress} size={20} strokeWidth={3} /> : <span>{t('admin.settings.upload')}</span>}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setIsDropdownOpen(prev => !prev)} 
                                disabled={isUploading} 
                                className="-ml-px relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-500"
                            >
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        {isDropdownOpen && (
                            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1">
                                    {uploadOptions.map(method => (
                                        <button 
                                            key={method} 
                                            type="button" 
                                            onClick={() => handleUploadClick(method)} 
                                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 capitalize"
                                        >
                                            {method === 'base64' ? t('admin.settings.base64') : method === 'imgbb' ? t('admin.settings.imgbb') : method === 'cloudinary' ? t('admin.settings.cloudinary') : method === 'tumblr' ? 'Tumblr' : 'Server'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={accept} />
            </div>
        </div>
    );
};

export default MediaInput;