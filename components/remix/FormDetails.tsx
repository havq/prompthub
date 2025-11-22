import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import Spinner from '../Spinner';

interface FormDetailsProps {
    title: string;
    setTitle: (val: string) => void;
    text: string;
    setText: (val: string) => void;
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
}

const FormDetails: React.FC<FormDetailsProps> = ({
    title, setTitle, text, setText, promptNote, setPromptNote, promptSource, setPromptSource, tagsInput, setTagsInput,
    onSuggestTags, isSuggestingTags, suggestTagsError, INPUT_STYLE
}) => {
    const { t } = useLanguage();

    return (
        <>
            <div>
                <label htmlFor="prompt-title-remix" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.titleLabel')}</label>
                <input 
                    id="prompt-title-remix" 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    className={`mt-1 ${INPUT_STYLE}`} 
                    required 
                />
            </div>
            <div>
                <label htmlFor="prompt-text-remix" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.promptText')}</label>
                <textarea 
                    id="prompt-text-remix" 
                    rows={4} 
                    value={text} 
                    onChange={(e) => setText(e.target.value)}
                    className={`mt-1 ${INPUT_STYLE}`} 
                    required 
                />
            </div>
            <div>
                <label htmlFor="prompt-note-remix" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prompt Note / Instructions</label>
                <textarea 
                    id="prompt-note-remix" 
                    rows={3} 
                    value={promptNote} 
                    onChange={(e) => setPromptNote(e.target.value)}
                    className={`mt-1 ${INPUT_STYLE}`} 
                    placeholder="Add notes about how you modified this prompt..." 
                />
            </div>
            <div>
                <label htmlFor="prompt-source-remix" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Source URL</label>
                <input 
                    id="prompt-source-remix" 
                    type="url" 
                    value={promptSource} 
                    onChange={(e) => setPromptSource(e.target.value)}
                    className={`mt-1 ${INPUT_STYLE}`} 
                    placeholder="https://..." 
                />
            </div>
            <div>
                <label htmlFor="prompt-tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.promptForm.tags')}</label>
                <div className="flex items-center gap-2 mt-1">
                    <input 
                        type="text" 
                        id="prompt-tags" 
                        value={tagsInput} 
                        onChange={(e) => setTagsInput(e.target.value)}
                        className={`flex-grow ${INPUT_STYLE}`} 
                        placeholder={t('admin.promptForm.tagsPlaceholder')} 
                    />
                    <button 
                        type="button" 
                        onClick={onSuggestTags} 
                        disabled={isSuggestingTags || !text.trim()} 
                        className="bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-800/80 text-indigo-700 dark:text-indigo-300 font-semibold py-2 px-4 rounded-md transition-colors text-sm w-44 flex justify-center"
                    >
                        {isSuggestingTags ? <Spinner size="sm" /> : '💡 ' + t('admin.promptForm.suggestTagsAI')}
                    </button>
                </div>
                {suggestTagsError && <p className="mt-1 text-xs text-red-500">{suggestTagsError}</p>}
            </div>
        </>
    );
};

export default FormDetails;