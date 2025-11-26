
import React, { useState, useEffect } from 'react';
import Spinner from '../Spinner';
import { PromptTextEntry } from '../../utils/types';
import ConfirmModal from '../ConfirmModal';
import { useLanguage } from '../../context/LanguageContext';

interface PromptBasicDetailsProps {
    title: string;
    setTitle: (val: string) => void;
    promptTexts: PromptTextEntry[];
    setPromptTexts: React.Dispatch<React.SetStateAction<PromptTextEntry[]>>;
    activeLangIndex: number;
    setActiveLangIndex: (index: number) => void;
    promptNote: string;
    setPromptNote: (val: string) => void;
    promptSource: string;
    setPromptSource: (val: string) => void;
    tagsInput: string;
    setTagsInput: (val: string) => void;
    onSuggestTags: () => void;
    isSuggestingTags: boolean;
    suggestTagsError: string;
    INPUT_STYLE: string;
    t: (key: string, options?: any) => string;
}

const PromptBasicDetails: React.FC<PromptBasicDetailsProps> = ({
    title, setTitle, promptTexts, setPromptTexts, activeLangIndex, setActiveLangIndex, promptNote, setPromptNote, promptSource, setPromptSource, tagsInput, setTagsInput,
    onSuggestTags, isSuggestingTags, suggestTagsError, INPUT_STYLE, t
}) => {
    const { language } = useLanguage();
    const [isLangModalOpen, setIsLangModalOpen] = useState(false);
    const [editingLangState, setEditingLangState] = useState<{ index: number | null, name: string }>({ index: null, name: '' });
    const [addLangError, setAddLangError] = useState('');
    const [deletingLangIndex, setDeletingLangIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!promptTexts || promptTexts.length === 0) return;

        // Automatically set the language tab for new empty prompts to the user's current language.
        // This runs when promptTexts or language changes, but the condition ensures it only applies to fresh prompts.
        if (promptTexts.length === 1 && promptTexts[0].text.trim() === '') {
            const langMapping: Record<string, string[]> = {
                'vi': ['Tiếng Việt', 'Vietnamese', 'VN', 'VI'],
                'en': ['English', 'Tiếng Anh', 'EN', 'US'],
                'zh': ['中文', 'Chinese', 'Tiếng Trung', 'ZH', 'CN'],
                'ko': ['한국어', 'Korean', 'Tiếng Hàn', 'KR', 'KO']
            };

            const currentLangLabels = langMapping[language] || [];
            const primaryLabel = currentLangLabels[0] || 'English';
            const currentLabel = promptTexts[0].lang;

            // Only override if the current label is the hardcoded default 'Tiếng Việt' 
            // and the user's language is NOT Vietnamese.
            if (currentLabel === 'Tiếng Việt' && primaryLabel !== 'Tiếng Việt') {
                 const newTexts = [...promptTexts];
                 newTexts[0].lang = primaryLabel;
                 setPromptTexts(newTexts);
            }
        }
    }, [promptTexts, language, setPromptTexts]);

    const openLangModal = (index: number | null = null) => {
        if (index !== null && promptTexts[index]) {
            setEditingLangState({ index, name: promptTexts[index].lang });
        } else {
            setEditingLangState({ index: null, name: '' });
        }
        setAddLangError('');
        setIsLangModalOpen(true);
    };

    const handleSaveLang = () => {
        const { index, name } = editingLangState;
        if (!name.trim()) {
            setAddLangError(t('admin.promptForm.languageNameError'));
            return;
        }
        const trimmedLang = name.trim();
        if (promptTexts.some((entry, i) => i !== index && entry.lang.toLowerCase() === trimmedLang.toLowerCase())) {
            setAddLangError(t('admin.promptForm.languageExistsError'));
            return;
        }

        const newTexts = [...promptTexts];
        if (index !== null) { // Editing
            newTexts[index].lang = trimmedLang;
            setPromptTexts(newTexts);
        } else { // Adding
            setPromptTexts([...newTexts, { lang: trimmedLang, text: '' }]);
            setActiveLangIndex(newTexts.length);
        }
        setIsLangModalOpen(false);
    };

    const handleRemoveLangClick = (indexToRemove: number) => {
        setDeletingLangIndex(indexToRemove);
    };

    const handleConfirmRemoveLang = () => {
        if (deletingLangIndex === null) return;
        
        const newTexts = promptTexts.filter((_, index) => index !== deletingLangIndex);
        setPromptTexts(newTexts);
        if (activeLangIndex >= deletingLangIndex) {
            setActiveLangIndex(Math.max(0, activeLangIndex - 1));
        }
        setDeletingLangIndex(null);
    };

    return (
        <>
            {deletingLangIndex !== null && promptTexts[deletingLangIndex] && (
                <ConfirmModal
                    isOpen={true}
                    onClose={() => setDeletingLangIndex(null)}
                    onConfirm={handleConfirmRemoveLang}
                    title={t('admin.promptForm.removeLanguageTitle')}
                    message={t('admin.promptForm.removeLanguageConfirm', { lang: promptTexts[deletingLangIndex].lang })}
                    confirmText={t('admin.promptForm.remove')}
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                />
            )}
            <div>
                <label htmlFor="prompt-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.titleLabel')}</label>
                <input id="prompt-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                    className={`mt-1 ${INPUT_STYLE}`} required placeholder={t('admin.promptForm.titlePlaceholder')} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('admin.promptForm.promptText')}
                </label>
                <div className="mt-1 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                    <div className="flex items-center border-b border-gray-300 dark:border-gray-600 flex-wrap bg-gray-50 dark:bg-gray-900/50">
                        {promptTexts.map((entry, index) => (
                            <div key={`${entry.lang}-${index}`} className="relative group">
                                <button
                                    type="button"
                                    onClick={() => setActiveLangIndex(index)}
                                    className={`p-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeLangIndex === index ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                                >
                                    {entry.lang}
                                </button>
                                <div className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-950 flex items-center opacity-0 group-hover:opacity-100">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); openLangModal(index); }}
                                        className="p-1 text-gray-400 hover:text-blue-500 rounded-full"
                                        title={`Edit ${entry.lang}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                    </button>
                                    {promptTexts.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveLangClick(index); }}
                                            className="p-1 text-gray-400 hover:text-red-500 rounded-full"
                                            title={`Remove ${entry.lang}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => openLangModal(null)}
                            className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
                            title="Add new language">+ {t('admin.promptForm.addNewLanguage')}</button>
                    </div>
                    <textarea
                        id="prompt-text-multilang"
                        rows={10}
                        value={promptTexts[activeLangIndex]?.text || ''}
                        onChange={(e) => {
                            const newTexts = [...promptTexts];
                            if (newTexts[activeLangIndex]) {
                                newTexts[activeLangIndex].text = e.target.value;
                                setPromptTexts(newTexts);
                            }
                        }}
                        className={`w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed border-0 rounded-b-md p-3`}
                        required
                        placeholder={t('admin.promptForm.enterPromptTextPlaceholder', { lang: promptTexts[activeLangIndex]?.lang || '' })}
                    />
                </div>
            </div>
            <div>
                <label htmlFor="prompt-note" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.promptNoteLabel')}</label>
                <textarea id="prompt-note" rows={3} value={promptNote} onChange={(e) => setPromptNote(e.target.value)}
                    className={`mt-1 ${INPUT_STYLE}`} placeholder={t('admin.promptForm.promptNotePlaceholder')} />
            </div>
            <div>
                <label htmlFor="prompt-source" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.sourceUrlLabel')}</label>
                <input id="prompt-source" type="url" value={promptSource} onChange={(e) => setPromptSource(e.target.value)}
                    className={`mt-1 ${INPUT_STYLE}`} placeholder={t('admin.promptForm.sourceUrlPlaceholder')} />
            </div>
            <div>
                <label htmlFor="prompt-tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.tags')}</label>
                <div className="flex items-center gap-2 mt-1">
                    <input type="text" id="prompt-tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                        className={`flex-grow ${INPUT_STYLE}`} placeholder={t('admin.promptForm.tagsPlaceholder')} />
                    <button type="button" onClick={onSuggestTags} disabled={isSuggestingTags || !promptTexts[activeLangIndex]?.text.trim()} className="bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-800/80 text-indigo-700 dark:text-indigo-300 font-semibold py-2 px-4 rounded-md transition-colors text-sm w-44 flex justify-center">
                        {isSuggestingTags ? <Spinner size="sm" /> : '💡 ' + t('admin.promptForm.suggestTagsAI')}
                    </button>
                </div>
                {suggestTagsError && <p className="mt-1 text-xs text-red-500">{suggestTagsError}</p>}
            </div>

            {isLangModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setIsLangModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            {editingLangState.index !== null ? t('admin.promptForm.editLanguageTitle') : t('admin.promptForm.addLanguageTitle')}
                        </h3>
                        <div>
                            <label htmlFor="lang-name-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.languageNameLabel')}</label>
                            <input
                                type="text"
                                id="lang-name-input"
                                value={editingLangState.name}
                                onChange={e => {
                                    setEditingLangState(prev => ({...prev, name: e.target.value}));
                                    if (addLangError) setAddLangError('');
                                }}
                                className={`mt-1 ${INPUT_STYLE}`}
                                placeholder={t('admin.promptForm.languageNamePlaceholder')}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveLang();
                                    }
                                }}
                            />
                            {addLangError && <p className="text-red-500 text-xs mt-1">{addLangError}</p>}
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsLangModalOpen(false)} className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                                {t('common.cancel')}
                            </button>
                            <button type="button" onClick={handleSaveLang} className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                                {editingLangState.index !== null ? t('admin.promptForm.saveName') : t('admin.promptForm.addLanguage')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PromptBasicDetails;
