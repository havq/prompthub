import React, { useState, useEffect } from 'react';
import { Prompt, Collection } from '../utils/types';
import { useLanguage } from '../context/LanguageContext';
import Spinner from './Spinner';

interface AddToCollectionModalProps {
  prompt: Prompt;
  userCollections: Collection[];
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onToggle: (promptId: string, collectionId: string) => Promise<void>;
}

const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({ prompt, userCollections, onClose, onCreate, onToggle }) => {
  const { t } = useLanguage();
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loadingToggles, setLoadingToggles] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      await onCreate(newCollectionName);
      setNewCollectionName('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (collectionId: string) => {
    setLoadingToggles(prev => new Set(prev).add(collectionId));
    try {
      await onToggle(prompt.id, collectionId);
    } finally {
      setLoadingToggles(prev => {
        const newSet = new Set(prev);
        newSet.delete(collectionId);
        return newSet;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md relative flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('modals.addToCollection.title')}</h2>
        
        <div className="flex-grow overflow-y-auto max-h-64 pr-2 mb-4">
          {userCollections.length > 0 ? (
            <ul className="space-y-2">
              {userCollections.map(collection => {
                const isInCollection = !!collection.promptIds?.[prompt.id];
                const isLoading = loadingToggles.has(collection.id);
                return (
                  <li key={collection.id}>
                    <label className={`flex items-center p-3 rounded-md transition-colors ${isInCollection ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700'} cursor-pointer`}>
                      <input
                        type="checkbox"
                        checked={isInCollection}
                        onChange={() => handleToggle(collection.id)}
                        disabled={isLoading}
                        className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 disabled:opacity-50"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200">{collection.name}</span>
                      {isLoading && <Spinner size="sm" className="ml-auto !text-indigo-500"/>}
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">{t('modals.addToCollection.noCollections')}</p>
          )}
        </div>

        <form onSubmit={handleCreate} className="flex-shrink-0 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder={t('modals.addToCollection.newPlaceholder')}
              className="flex-grow bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"
              required
            />
            <button
              type="submit"
              disabled={isCreating}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors w-28 flex justify-center disabled:opacity-50"
            >
              {isCreating ? <Spinner size="sm" /> : t('modals.addToCollection.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddToCollectionModal;