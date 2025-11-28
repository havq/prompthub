
import React from 'react';

interface PromptExtraDetailsProps {
    promptNote: string;
    setPromptNote: (val: string) => void;
    promptSource: string;
    setPromptSource: (val: string) => void;
    tagsInput: string;
    setTagsInput: (val: string) => void;
    INPUT_STYLE: string;
    t: (key: string, options?: any) => string;
}

const PromptExtraDetails: React.FC<PromptExtraDetailsProps> = ({
    promptNote, setPromptNote, promptSource, setPromptSource, tagsInput, setTagsInput,
    INPUT_STYLE, t
}) => {
    return (
        <div className="space-y-4">
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
                <input type="text" id="prompt-tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                    className={`mt-1 ${INPUT_STYLE}`} placeholder={t('admin.promptForm.tagsPlaceholder')} />
            </div>
        </div>
    );
};

export default PromptExtraDetails;
