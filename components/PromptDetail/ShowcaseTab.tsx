
import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';
import Spinner from '../Spinner';
import { ShowcaseImage } from '../../utils/types';
import { buildUrl } from '../../utils/permalinks';

interface ShowcaseTabProps {
    showcaseImages: ShowcaseImage[];
    isLoadingShowcase: boolean;
    onUploadClick: () => void;
    onGalleryOpen: (index: number) => void;
    onDeleteClick: (id: string) => void;
    currentUser: any;
    isAdmin: boolean;
    onClose: () => void;
}

const ShowcaseTab: React.FC<ShowcaseTabProps> = ({
    showcaseImages,
    isLoadingShowcase,
    onUploadClick,
    onGalleryOpen,
    onDeleteClick,
    currentUser,
    isAdmin,
    onClose
}) => {
    const { t } = useLanguage();

    return (
        <div>
            <div className="flex justify-center mb-6"><button onClick={onUploadClick} className="inline-flex items-center gap-2 rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">{t('promptDetail.uploadCreation')}</button></div>
            {isLoadingShowcase ? (<div className="flex justify-center"><Spinner /></div>) : showcaseImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                    {showcaseImages.map((image, index) => (
                        <div key={image.id} className="relative group aspect-square">
                            <img onClick={() => onGalleryOpen(index)} src={transformCloudinaryUrl(image.imageUrl, 'w_200,h_200,c_fill,g_auto')} alt={`Showcase by ${image.username}`} className="w-full h-full object-cover rounded-md bg-gray-200 dark:bg-gray-700 cursor-pointer"/>
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 pointer-events-none"><p className="text-white text-xs">by <Link to={buildUrl('author', { authorId: image.userId })} onClick={(e) => {e.stopPropagation(); onClose();}} className="font-semibold hover:underline pointer-events-auto">{image.username}</Link></p></div>
                            {(currentUser?.uid === image.userId || isAdmin) && (<button onClick={() => onDeleteClick(image.id)} className="absolute top-1 right-1 p-1.5 bg-red-600/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm hover:bg-red-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>)}
                        </div>
                    ))}
                </div>
            ) : (<p className="text-center text-sm text-gray-500 dark:text-gray-400">{t('promptDetail.noShowcase')}</p>)}
        </div>
    );
};

export default ShowcaseTab;
