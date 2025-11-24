
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { getPrompts, getCategories, getCommentCounts, getCollections, createCollection, togglePromptInCollection, getAllShowcaseImageCounts, addShowcaseImage, updatePrompt, deletePrompt as apiDeletePrompt, addPrompt as apiAddPrompt, getCombinedRatings, saveRating } from '../services/api';
import { Prompt, CategoryWithCount, Collection, UserProfile } from '../utils/types';
import { getSettings } from '../services/settingsService';
import { getFavorites, toggleFavorite } from '../services/favoriteService';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from './useDebounce';
import { GetPromptsParams } from '../services/externalApi';

export const useHomeLogic = () => {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [searchablePrompts, setSearchablePrompts] = useState<Prompt[]>([]);
    const [totalPrompts, setTotalPrompts] = useState(0);
    const [categories, setCategories] = useState<CategoryWithCount[]>([]);
    // Removed users state as it's no longer fetched here
    const [allTags, setAllTags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchParams, setSearchParams] = useSearchParams();
    const params = useParams<{ categoryId?: string, searchTerm?: string, tag?: string, dateFilter?: string }>();
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    const [selectedCategory, setSelectedCategory] = useState<string | 'All'>(() => params.categoryId || searchParams.get('category') || 'All');
    const [selectedTag, setSelectedTag] = useState<string | null>(() => params.tag || searchParams.get('tag') || null);
    const [selectedDateFilter, setSelectedDateFilter] = useState<string>(() => params.dateFilter || searchParams.get('date') || 'all');
    const [sortBy, setSortBy] = useState<GetPromptsParams['sortBy']>('newest');
    const [averageRatings, setAverageRatings] = useState<Record<string, { average: number; count: number }>>({});

    const [searchInput, setSearchInput] = useState(params.searchTerm || searchParams.get('searchTerm') || '');
    const debouncedSearchTerm = useDebounce(searchInput, 500);

    // Advanced Filters
    const [commentFilter, setCommentFilter] = useState<'any' | 'yes' | 'no'>('any');
    const [remixFilter, setRemixFilter] = useState<'any' | 'yes' | 'no'>('any');
    const [referenceImageFilter, setReferenceImageFilter] = useState<'any' | 'yes' | 'no'>('any');
    const [nsfwFilter, setNsfwFilter] = useState<'any' | 'yes' | 'no'>('any');

    const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
    const [showcaseCounts, setShowcaseCounts] = useState<Record<string, number>>({});
    
    const navigate = useNavigate();
    const { currentUser, userProfile, isAdmin, isPro } = useAuth();
    const prevUserRef = useRef(currentUser);

    const [collections, setCollections] = useState<Collection[]>([]);
    const [refetchTrigger, setRefetchTrigger] = useState(0);

    const [settings, setSettings] = useState(() => getSettings());
    const [promptsPerPage, setPromptsPerPage] = useState(() => getSettings().promptDisplayCount);
    const [paginationStyle, setPaginationStyle] = useState(() => getSettings().paginationStyle || 'pagination');

    const [currentPage, setCurrentPage] = useState(1);
    
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');

    useEffect(() => {
        prevUserRef.current = currentUser;
    });

    useEffect(() => {
        const handleSettingsChange = () => {
            const newSettings = getSettings();
            setSettings(newSettings);
            setPromptsPerPage(newSettings.promptDisplayCount);
            setPaginationStyle(newSettings.paginationStyle || 'pagination');
        };
        window.addEventListener('storage', handleSettingsChange);
        return () => window.removeEventListener('storage', handleSettingsChange);
    }, []);

    const resetPaging = useCallback(() => {
        setCurrentPage(1);
        if (paginationStyle === 'infiniteScroll') {
            setPrompts([]);
        }
    }, [paginationStyle]);

    // State setters wrappers that also reset paging to avoid race conditions
    const setCommentFilterWithReset = useCallback((val: any) => { setCommentFilter(val); resetPaging(); }, [resetPaging]);
    const setRemixFilterWithReset = useCallback((val: any) => { setRemixFilter(val); resetPaging(); }, [resetPaging]);
    const setReferenceImageFilterWithReset = useCallback((val: any) => { setReferenceImageFilter(val); resetPaging(); }, [resetPaging]);
    const setNsfwFilterWithReset = useCallback((val: any) => { setNsfwFilter(val); resetPaging(); }, [resetPaging]);
    const setSortByWithReset = useCallback((val: any) => { setSortBy(val); resetPaging(); }, [resetPaging]);
    const setSelectedDateFilterWithReset = useCallback((val: any) => { setSelectedDateFilter(val); resetPaging(); }, [resetPaging]);
    const setSearchInputWithReset = useCallback((val: string) => { setSearchInput(val); resetPaging(); }, [resetPaging]);

    useEffect(() => {
        const cat = params.categoryId || searchParams.get('category') || 'All';
        const tag = params.tag || searchParams.get('tag') || null;
        const date = params.dateFilter || searchParams.get('date') || 'all';
        const search = params.searchTerm || searchParams.get('searchTerm') || '';

        let shouldReset = false;
        if (selectedCategory !== cat) { setSelectedCategory(cat); shouldReset = true; }
        if (selectedTag !== tag) { setSelectedTag(tag); shouldReset = true; }
        if (selectedDateFilter !== date) { setSelectedDateFilter(date); shouldReset = true; }
        if (searchInput !== search) { setSearchInput(search); shouldReset = true; }
        
        if (shouldReset) {
            resetPaging();
        }
    }, [params, searchParams, selectedCategory, selectedTag, selectedDateFilter, searchInput, resetPaging]);

    const fetchData = useCallback(async () => {
        const isLoggingOut = !!prevUserRef.current && !currentUser;
        if (isLoggingOut) {
            setCollections([]);
            setFavorites(new Set());
            setRatings({});
            return;
        }

        setIsLoading(true);
        try {
            const [collectionsData, showcaseData, commentCountsData, favoritesData, combinedRatingsData, categoriesData] = await Promise.all([
                getCollections(currentUser),
                getAllShowcaseImageCounts(),
                getCommentCounts(),
                getFavorites(currentUser),
                getCombinedRatings(currentUser?.uid),
                getCategories(),
            ]);

            setCollections(collectionsData);
            setShowcaseCounts(showcaseData);
            setFavorites(favoritesData);
            
            setRatings(combinedRatingsData.userRatings);
            setAverageRatings(combinedRatingsData.averageRatings);
            
            setCategories(categoriesData);
            
            setCommentCounts(commentCountsData);

            // Removed getAllUsers call to optimize performance

        } catch (error) {
            console.error("Failed to fetch page data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        let isActive = true;

        const fetchPagedPrompts = async () => {
            setIsLoading(true);
            try {
                const limit = promptsPerPage;
                const page = paginationStyle === 'infiniteScroll' ? Math.floor(prompts.length / limit) + 1 : currentPage;

                const params: GetPromptsParams = {
                    page: page,
                    limit: limit,
                    sortBy: sortBy,
                    searchTerm: debouncedSearchTerm,
                    category: selectedCategory,
                    tag: selectedTag || undefined,
                    date: selectedDateFilter,
                    commentFilter: commentFilter,
                    remixFilter: remixFilter,
                    referenceImageFilter: referenceImageFilter,
                    nsfwFilter: nsfwFilter,
                };

                const { prompts: newPrompts, total, allTags: serverTags } = await getPrompts(params);

                if (isActive) {
                    if (paginationStyle === 'infiniteScroll' && page > 1) {
                        setPrompts(prev => [...prev, ...newPrompts]);
                    } else {
                        setPrompts(newPrompts);
                    }
                    setTotalPrompts(total);

                    if (page === 1) {
                        if (serverTags) setAllTags(serverTags);
                    }
                }

            } catch (error) {
                if (isActive) {
                    console.error("Failed to fetch prompts:", error);
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        fetchPagedPrompts();
        
        return () => {
            isActive = false;
        };
    }, [
        debouncedSearchTerm, selectedCategory, selectedTag, selectedDateFilter,
        sortBy, commentFilter, remixFilter, referenceImageFilter, nsfwFilter,
        currentPage, promptsPerPage, paginationStyle, refetchTrigger
    ]);

    const handleRatePrompt = async (prompt: Prompt, newRating: number, setIsLoginModalOpen: (val: boolean) => void) => {
        if (!currentUser || !userProfile) {
            setIsLoginModalOpen(true);
            return;
        }
        await saveRating(prompt, newRating, userProfile);
        const combinedData = await getCombinedRatings(currentUser.uid);
        setRatings(combinedData.userRatings);
        setAverageRatings(combinedData.averageRatings);
    };

    const handleToggleFavorite = async (prompt: Prompt) => {
        // FIX: Pass current favorites state to avoid re-fetching from server
        const newFavorites = await toggleFavorite(prompt.id, currentUser, prompt.authorId, favorites);
        setFavorites(newFavorites);
    };

    const updateCommentCount = useCallback((promptId: string, change: 1 | -1) => {
        setCommentCounts(prev => ({ ...prev, [promptId]: (prev[promptId] || 0) + change }));
    }, []);

    const updateShowcaseCount = useCallback((promptId: string, change: 1 | -1) => {
        setShowcaseCounts(prev => ({ ...prev, [promptId]: Math.max(0, (prev[promptId] || 0) + change) }));
    }, []);
    
    const handleCreateCollection = async (name: string) => { setCollections(await createCollection(currentUser, name)); };
    const handleToggleInCollection = async (promptId: string, collectionId: string) => { setCollections(await togglePromptInCollection(currentUser, promptId, collectionId)); };
    
    const handleShowcaseSubmit = async (imageUrl: string, promptForShowcase: Prompt | null) => {
        if (!promptForShowcase || !currentUser || !userProfile) return;
        await addShowcaseImage({ promptId: promptForShowcase.id, userId: currentUser.uid, username: userProfile.username, userPhotoURL: userProfile.photoURL, imageUrl });
        setShowcaseCounts(prev => ({...prev, [promptForShowcase.id]: (prev[promptForShowcase.id] || 0) + 1}));
    };

    const handlePromptFormSubmit = async (formData: Omit<Prompt, 'id' | 'createdAt'> | Prompt, selectedPrompt: Prompt | null, setSelectedPrompt: (p: Prompt) => void) => {
        try {
            if ('id' in formData) {
                const updated = await updatePrompt(formData);
                setPrompts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
                if (selectedPrompt?.id === updated.id) setSelectedPrompt(updated);
            } else {
                await apiAddPrompt(formData);
                resetPaging();
                setRefetchTrigger(c => c + 1);
            }
        } catch (error) {
            console.error("Failed to submit prompt:", error);
            alert("An error occurred while saving the prompt.");
            throw error;
        }
    };

    const handleConfirmDelete = async (deletingPrompt: Prompt | null, selectedPrompt: Prompt | null, setSelectedPrompt: (p: Prompt | null) => void) => {
        if (!deletingPrompt) return;
        try {
            await apiDeletePrompt(deletingPrompt.id);
            if (selectedPrompt?.id === deletingPrompt.id) setSelectedPrompt(null);
            setRefetchTrigger(c => c + 1);
        } catch (error) {
            console.error("Failed to delete prompt:", error);
            throw error;
        }
    };

    const handleFindSimilar = async (prompt: Prompt) => {
        if (searchablePrompts.length === 0) {
             try {
                 const response = await getPrompts({ page: 1, limit: 200, sortBy: 'newest' });
                 setSearchablePrompts(response.prompts);
             } catch (error) {
                 console.error("Failed to fetch searchable prompts:", error);
             }
        }
    };

    const totalPages = Math.ceil(totalPrompts / promptsPerPage);
    const hasMore = prompts.length < totalPrompts;

    return {
        prompts,
        searchablePrompts,
        totalPrompts,
        categories,
        users: [], // Return empty array since we don't fetch users here anymore
        allTags,
        isLoading,
        ratings,
        favorites,
        averageRatings,
        commentCounts,
        showcaseCounts,
        collections,
        settings,
        paginationStyle,
        currentPage,
        setCurrentPage,
        viewMode,
        setViewMode,
        selectedCategory,
        setSelectedCategory,
        selectedTag,
        setSelectedTag,
        selectedDateFilter,
        setSelectedDateFilter: setSelectedDateFilterWithReset,
        sortBy,
        setSortBy: setSortByWithReset,
        searchInput,
        setSearchInput: setSearchInputWithReset,
        debouncedSearchTerm,
        commentFilter,
        setCommentFilter: setCommentFilterWithReset,
        remixFilter,
        setRemixFilter: setRemixFilterWithReset,
        referenceImageFilter,
        setReferenceImageFilter: setReferenceImageFilterWithReset,
        nsfwFilter,
        setNsfwFilter: setNsfwFilterWithReset,
        handleRatePrompt,
        handleToggleFavorite,
        updateCommentCount,
        updateShowcaseCount,
        handleCreateCollection,
        handleToggleInCollection,
        handleShowcaseSubmit,
        handlePromptFormSubmit,
        handleConfirmDelete,
        handleFindSimilar,
        totalPages,
        hasMore,
        currentUser,
        userProfile,
        isAdmin,
        isPro,
        refetchTrigger,
        setRefetchTrigger,
        resetPaging
    };
};
