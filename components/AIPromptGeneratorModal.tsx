import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { useLanguage } from '../context/LanguageContext';
import Spinner from './Spinner';

interface AIPromptGeneratorModalProps {
  onClose: () => void;
}

interface GeneratedPrompt {
    prompt: string;
}

const AIPromptGeneratorModal: React.FC<AIPromptGeneratorModalProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const [idea, setIdea] = useState('');
  const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedStates, setCopiedStates] = useState<boolean[]>([]);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setGeneratedPrompts([]);
    setCopiedStates([]);

    if (!process.env.API_KEY) {
      if (isMounted.current) {
        setError(t('modals.aiPromptGenerator.error.apiKey'));
        setIsLoading(false);
      }
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            prompt: {
              type: Type.STRING,
              description: 'A detailed, creative prompt for an AI image generator.'
            }
          },
          required: ['prompt']
        }
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: idea,
        config: {
          systemInstruction: 'You are a professional prompt engineer for AI image generation models. Expand the user\'s idea into three detailed, creative prompts with different styles, lighting, and composition. Only return a JSON array of the prompts.',
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      if (isMounted.current) {
        const jsonStr = response.text.trim();
        const promptsArray: GeneratedPrompt[] = JSON.parse(jsonStr);
        const extractedPrompts = promptsArray.map(p => p.prompt);
        setGeneratedPrompts(extractedPrompts);
        setCopiedStates(new Array(extractedPrompts.length).fill(false));
      }

    } catch (err: any) {
      if (isMounted.current) {
        const isCancellation = err.name === 'AbortError' || err.message?.includes('Canceled');
        if (!isCancellation) {
            console.error("AI prompt generation error:", err);
            setError(t('modals.aiPromptGenerator.error.generic'));
        } else {
            console.log("AI request canceled by user action.");
        }
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleCopy = (index: number, text: string) => {
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
        const newCopiedStates = [...copiedStates];
        newCopiedStates[index] = true;
        setCopiedStates(newCopiedStates);
        setTimeout(() => {
            setCopiedStates(prev => {
                const resetStates = [...prev];
                resetStates[index] = false;
                return resetStates;
            });
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy text.');
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[90vh] relative flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('modals.aiPromptGenerator.title')}</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white" aria-label="Close modal" disabled={isLoading}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 flex flex-col flex-grow overflow-y-auto">
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('modals.aiPromptGenerator.subtitle')}</p>
          <form onSubmit={handleGenerate}>
            <label htmlFor="idea-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modals.aiPromptGenerator.inputLabel')}</label>
            <textarea
              id="idea-input"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder={t('modals.aiPromptGenerator.inputPlaceholder')}
              rows={3}
              className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <button
              type="submit"
              disabled={isLoading || !idea.trim()}
              className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  {t('modals.aiPromptGenerator.generating')}
                </>
              ) : (
                t('modals.aiPromptGenerator.generateButton')
              )}
            </button>
          </form>

          {error && <p className="mt-4 text-center text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-3 rounded-md">{error}</p>}
          
          <div className="mt-6 flex-grow">
            {generatedPrompts.length > 0 && <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{t('modals.aiPromptGenerator.resultsTitle')}</h3>}
            <div className="space-y-4">
              {generatedPrompts.map((prompt, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-gray-700 dark:text-gray-300 mb-3">{prompt}</p>
                  <button
                    onClick={() => handleCopy(index, prompt)}
                    className="w-28 text-center bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/70 dark:hover:bg-indigo-800/80 text-indigo-800 dark:text-indigo-300 font-semibold py-1.5 px-3 rounded-md transition-colors text-xs"
                  >
                    {copiedStates[index] ? t('modals.aiPromptGenerator.copied') : t('modals.aiPromptGenerator.copy')}
                  </button>
                </div>
              ))}
              {!isLoading && generatedPrompts.length === 0 && idea && (
                  <p className="text-center text-gray-500 dark:text-gray-400 mt-8">{t('modals.aiPromptGenerator.noResults')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPromptGeneratorModal;