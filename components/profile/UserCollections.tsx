
// components/profile/UserCollections.tsx
import React, { useState, useMemo } from 'react';
import { Collection, Prompt } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { createCollection, updateCollection, deleteCollection, togglePromptInCollection } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import Spinner from '../Spinner';
import PromptCard from '../PromptCard';
import ConfirmModal from '../ConfirmModal';
// @ts-ignore
import { Link } from 'react-router-dom';

interface CardProps {
    categories: any[];
    ratings: Record<string, number>;
    favorites: Set<string>;
    averageRatings: Record<string, { average: number; count: number }>;
    commentCounts: Record<string, number>;
    showcaseCounts: Record<string, number>;
    isAdmin: boolean;
    currentUser: any;
    onRate: (prompt: Prompt, rating: number) => void;
    onToggleFavorite: (prompt: Prompt) => void;
    onFindSimilar: (prompt: Prompt) => void;
    onOpenDetail: (prompt: Prompt) => void;
    onReport: (prompt: Prompt) => void;
    onRemix: (prompt: Prompt) => void;
    onAddToCollection: (prompt: Prompt) => void;
    onUploadShowcase: (prompt: Prompt) => void;
    onEdit: (prompt: Prompt) => void;
    onDelete: (prompt: Prompt) => void;
}

interface UserCollectionsProps {
    collections: Collection[];
    setCollections: React.Dispatch<React.SetStateAction<Collection[]>>;
    allPrompts: Prompt[];
    cardProps: CardProps;
}

const UserCollections: React.FC<UserCollectionsProps> = ({ collections, setCollections, allPrompts, cardProps }) => {
    const { t, tComponent } = useLanguage();
    const { currentUser } = useAuth();
    const [newCollectionName, setNewCollectionName] = useState('');
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
    const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null);
    const [isCollectionOpLoading, setIsCollectionOpLoading] = useState(false);
    const [activeCollectionId, setActiveCollectionId] = useState<string | null>(collections[0]?.id || null);
    
    const activeCollection = useMemo(() => collections.find(c => c.id === activeCollectionId), [collections, activeCollectionId]);
    const activeCollectionPrompts = useMemo(() => {
        if (!activeCollection) return [];
        return allPrompts.filter(p => activeCollection.promptIds?.[p.id]);
    }, [allPrompts, activeCollection]);

    const handleNewCollectionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCollectionName.trim() || isCollectionOpLoading) return;
        setIsCollectionOpLoading(true);
        try {
            const updated = await createCollection(currentUser, newCollectionName);
            setCollections(updated);
            const newColl = updated.find(c => c.name === newCollectionName && !collections.some(oc => oc.id === c.id));
            if(newColl) setActiveCollectionId(newColl.id);
            setNewCollectionName('');
        } catch (err) { console.error(err); } 
        finally { setIsCollectionOpLoading(false); }
    };

    const handleConfirmDelete = async () => {
        if (!deletingCollection || isCollectionOpLoading) return;
        setIsCollectionOpLoading(true);
        try {
            const updated = await deleteCollection(currentUser, deletingCollection.id);
            setCollections(updated);
            if (activeCollectionId === deletingCollection.id) setActiveCollectionId(updated[0]?.id || null);
            setDeletingCollection(null);
        } catch (err) { console.error(err); } 
        finally { setIsCollectionOpLoading(false); }
    };
    
    const handleUpdateName = async () => {
        if (!editingCollection || !editingCollection.name.trim() || isCollectionOpLoading) return;
        setIsCollectionOpLoading(true);
        try {
            const updated = await updateCollection(currentUser, editingCollection.id, editingCollection.name);
            setCollections(updated);
            setEditingCollection(null);
        } catch (err) { console.error(err); } 
        finally { setIsCollectionOpLoading(false); }
    };

    return (
        <div className="space-y-6">
            {deletingCollection && <ConfirmModal isOpen={!!deletingCollection} onClose={() => setDeletingCollection(null)} onConfirm={handleConfirmDelete} title={t('common.delete')} message={t('profile.deleteCollectionConfirm', { name: deletingCollection.name })} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isCollectionOpLoading} />}
            <form onSubmit={handleNewCollectionSubmit} className="flex items-center gap-2 max-w-sm"><input type="text" value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} placeholder={t('profile.newCollection')} className="flex-grow bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600" required/><button type="submit" disabled={isCollectionOpLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors w-24 flex justify-center">{isCollectionOpLoading && !editingCollection ? <Spinner size="sm"/> : t('common.add')}</button></form>
            {collections.length > 0 ? (
                <>
                    <div className="border-b border-gray-200 dark:border-gray-700"><nav className="-mb-px flex space-x-4 overflow-x-auto scrollbar-hide" aria-label="Tabs">{collections.map(c => (<button key={c.id} onClick={() => setActiveCollectionId(c.id)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeCollectionId === c.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{c.name} ({Object.keys(c.promptIds || {}).length})</button>))}</nav></div>
                    {activeCollection && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center gap-4">
                                {editingCollection?.id === activeCollection.id ? (<input type="text" value={editingCollection.name} onChange={(e) => setEditingCollection({...editingCollection, name: e.target.value})} onBlur={handleUpdateName} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateName(); if(e.key === 'Escape') setEditingCollection(null); }} className="text-2xl font-bold bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-2 py-1 -ml-2" autoFocus/>) : (<h2 className="text-2xl font-bold text-gray-900 dark:text-white">{activeCollection.name}</h2>)}
                                <div className="flex items-center space-x-4"><button onClick={() => setEditingCollection(activeCollection)} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">{t('profile.rename')}</button><button onClick={() => setDeletingCollection(activeCollection)} className="text-red-600 dark:text-red-400 hover:underline text-sm font-medium">{t('common.delete')}</button></div>
                            </div>
                            {activeCollectionPrompts.length > 0 ? (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">{activeCollectionPrompts.map(prompt => {const { currentUser, isAdmin, ...rest } = cardProps; return (<PromptCard key={prompt.id} prompt={prompt} {...rest} userRating={cardProps.ratings[prompt.id] || 0} isFavorite={cardProps.favorites.has(prompt.id)} averageRating={(cardProps.averageRatings[prompt.id] || { average: 0 }).average} ratingCount={(cardProps.averageRatings[prompt.id] || { count: 0 }).count} commentCount={cardProps.commentCounts[prompt.id] || 0} showcaseCount={cardProps.showcaseCounts[prompt.id] || 0} viewCount={prompt.viewCount || 0} onClick={() => cardProps.onOpenDetail(prompt)} canManage={isAdmin || (currentUser && prompt.authorId === currentUser.uid)} onRemoveFromCollection={() => cardProps.onAddToCollection(prompt)} />)})}</div>) : (<div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg"><p className="text-gray-500 dark:text-gray-400">{tComponent('profile.noPromptsInCollection', { '1': (text) => <Link to="/" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{text}</Link> })}</p></div>)}
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg"><p className="text-gray-600 dark:text-gray-400">{t('profile.noCollections')}</p></div>
            )}
        </div>
    );
};

export default UserCollections;
