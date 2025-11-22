
import { Collection } from '../../types';
import { fetchApi, mapItems } from './core';

export const getCollectionsForUser = (userId: string): Promise<Collection[]> => fetchApi<Collection[]>('collections', `&userId=${userId}`).then(mapItems);
export const createCollectionForUser = (userId: string, name: string): Promise<Collection> => fetchApi<Collection>('collections', '', { method: 'POST', body: JSON.stringify({ userId, name }) });
export const renameCollectionForUser = (userId: string, collectionId: string, newName: string): Promise<void> => fetchApi<void>('collections', `&id=${collectionId}`, { method: 'PUT', body: JSON.stringify({ name: newName, userId }) });
export const deleteCollectionForUser = (userId: string, collectionId: string): Promise<void> => fetchApi<void>('collections', `&id=${collectionId}&userId=${userId}`, { method: 'DELETE' });
export const togglePromptInCollectionForUser = (userId: string, collectionId: string, promptId: string, isInCollection: boolean): Promise<void> => fetchApi<void>('collections', `&id=${collectionId}`, { method: 'POST', body: JSON.stringify({ userId, promptId, action: isInCollection ? 'remove' : 'add' }) });
export const getAllCollectionMappings = (): Promise<Record<string, number>> => fetchApi<Record<string, number>>('collections', `&action=mappings`);
