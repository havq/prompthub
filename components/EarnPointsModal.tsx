
import React from 'react';
import { POINTS } from '../services/gamificationService';
import { useLanguage } from '../context/LanguageContext';

interface EarnPointsModalProps {
    onClose: () => void;
}

const EarnPointsModal: React.FC<EarnPointsModalProps> = ({ onClose }) => {
    const { t } = useLanguage();

    const pointItems = [
        {
            key: 'PROMPT_REMIXED',
            points: POINTS.PROMPT_REMIXED,
            icon: '🎨',
            title: t('profile.earnPoints.items.promptRemixed.title'),
            desc: t('profile.earnPoints.items.promptRemixed.desc'),
            color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
        },
        {
            key: 'PROMPT_COLLECTED',
            points: POINTS.PROMPT_COLLECTED,
            icon: '📂',
            title: t('profile.earnPoints.items.promptCollected.title'),
            desc: t('profile.earnPoints.items.promptCollected.desc'),
            color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
        },
        {
            key: 'RATING_5_STAR',
            points: POINTS.RATING_5_STAR,
            icon: '⭐',
            title: t('profile.earnPoints.items.rating5Star.title'),
            desc: t('profile.earnPoints.items.rating5Star.desc'),
            color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
        },
        {
            key: 'PROMPT_FAVORITED',
            points: POINTS.PROMPT_FAVORITED,
            icon: '❤️',
            title: t('profile.earnPoints.items.promptFavorited.title'),
            desc: t('profile.earnPoints.items.promptFavorited.desc'),
            color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
        },
        {
            key: 'COMMENT_RECEIVED',
            points: POINTS.COMMENT_RECEIVED,
            icon: '💬',
            title: t('profile.earnPoints.items.commentReceived.title'),
            desc: t('profile.earnPoints.items.commentReceived.desc'),
            color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
        }
    ];

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[80] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{t('profile.earnPoints.title')}</h2>
                        <p className="text-indigo-100 text-sm mt-1">{t('profile.earnPoints.subtitle')}</p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-4">
                        {pointItems.map((item) => (
                            <div key={item.key} className="flex items-center p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center text-2xl ${item.color}`}>
                                    {item.icon}
                                </div>
                                <div className="ml-4 flex-grow">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                        +{item.points} pts
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-6 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('profile.earnPoints.footerNote')}
                        </p>
                    </div>
                </div>
                
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-center">
                    <button onClick={onClose} className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-lg transition-colors">
                        {t('profile.earnPoints.gotIt')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EarnPointsModal;
