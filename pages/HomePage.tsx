
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Prompt, HomeWidget, CategoryWithCount } from '../utils/types';
import PromptCard from '../components/PromptCard';
import CategoryTabs from '../components/CategoryTabs';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import { useLanguage } from '../context/LanguageContext';
import PromptCardSkeleton from '../components/PromptCardSkeleton';
import ViewModeSwitcher from '../components/ViewModeSwitcher';
import { buildUrl } from '../utils/permalinks';
import { formatCount } from '../utils/formatters';
import { useHomeLogic } from '../hooks/useHomeLogic';
import { getSettings } from '../services/settingsService';

// New Components
import HomeHeader from '../components/home/HomeHeader';
import MobileFilterPanel from '../components/home/MobileFilterPanel';
import HomeModals from '../components/home/HomeModals';
import { getPrompt } from '../services/api';
import HeroBannerWidget from '../components/widgets/HeroBannerWidget';
import PromptGridWidget from '../components/widgets/PromptGridWidget';
import RichTextWidget from '../components/widgets/RichTextWidget';
import PostGridWidget from '../components/widgets/PostGridWidget';
import ReelGridWidget from '../components/widgets/ReelGridWidget';
import TopContributorsWidget from '../components/widgets/TopContributorsWidget';

export const HomePage: React.FC = () => {
  const logic = useHomeLogic();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { promptId: routePromptId } = useParams<{ promptId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Local UI state not needed in logic hook
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isMobileCategoryExpanded, setIsMobileCategoryExpanded] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const promptListRef = useRef<HTMLDivElement>(null);
  
  // Homepage Layout State
  const [homeLayout, setHomeLayout] = useState<HomeWidget[]>([]);
  
  const TAGS_TO_SHOW_INITIAL = 12;
  const MOBILE_CATEGORY_LIMIT = 5;

  useEffect(() => {
      const settings = getSettings();
      setHomeLayout(settings.homeLayout || []);
  }, []);

  // --- Effects for UI Interactions ---

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToPromptList = () => {
    if (promptListRef.current) {
        const header = document.querySelector('header');
        const headerOffset = (header ? header.offsetHeight : 70) + 16;
        const elementPosition = promptListRef.current.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const handlePageChange = (page: number) => {
    logic.setCurrentPage(page);
    scrollToPromptList();
  };

  const handleCategorySelect = (categoryId: string | 'All') => {
    if (logic.settings.routerMode === 'browser') {
        navigate(categoryId === 'All' ? '/' : buildUrl('promptCategory', { categoryId }));
    } else {
        const newParams = new URLSearchParams(window.location.hash.split('?')[1]);
        if (categoryId === 'All') newParams.delete('category');
        else newParams.set('category', categoryId);
        newParams.delete('page');
        navigate(`?${newParams.toString()}`);
    }
  };

  const handleSelectDateFilter = (filter: string) => {
      if (logic.settings.routerMode === 'browser') {
          const newSearchParams = new URLSearchParams(location.search);
          if (filter === 'all') {
              newSearchParams.delete('date');
          } else {
              newSearchParams.set('date', filter);
          }
          newSearchParams.delete('page');
          
          navigate({
              pathname: location.pathname,
              search: newSearchParams.toString()
          });
      } else {
          const newParams = new URLSearchParams(window.location.hash.split('?')[1]);
          if (filter === 'all') newParams.delete('date');
          else newParams.set('date', filter);
          newParams.delete('page');
          navigate(`?${newParams.toString()}`);
      }
  };

  const handleSelectTag = (tag: string | null) => {
    if (logic.settings.routerMode === 'browser') {
        navigate(tag ? buildUrl('tag', { tag }) : '/');
    } else {
        const newParams = new URLSearchParams(window.location.hash.split('?')[1]);
        if (tag) newParams.set('tag', tag);
        else newParams.delete('tag');
        newParams.delete('page');
        navigate(`?${newParams.toString()}`);
    }
  };
  
  const isAnyFilterActive = (
      logic.selectedCategory !== 'All' ||
      logic.selectedTag !== null ||
      logic.selectedDateFilter !== 'all' ||
      logic.debouncedSearchTerm.trim() !== '' ||
      logic.sortBy !== 'newest' ||
      logic.commentFilter !== 'any' ||
      logic.remixFilter !== 'any' ||
      logic.referenceImageFilter !== 'any' ||
      logic.nsfwFilter !== 'any'
  );

  const handleClearFilters = () => {
    logic.setSearchInput('');
    logic.setCommentFilter('any');
    logic.setRemixFilter('any');
    logic.setReferenceImageFilter('any');
    logic.setNsfwFilter('any');
    logic.setSortBy('newest');
    navigate('/');
  };

  const selectedCategoryName = () => {
    if (logic.selectedCategory === 'All') return `${t('common.all')} (${formatCount(logic.totalPrompts)})`;
    const category = logic.categories.find(f => f.id === logic.selectedCategory);
    return category ? `${category.name} (${formatCount(category.promptCount)})` : t('common.all');
  };

  // Infinite Scroll Observer
  useEffect(() => {
      if (logic.paginationStyle !== 'infiniteScroll' || logic.isLoading || !logic.hasMore) return;
      const observer = new IntersectionObserver(
          (entries) => {
              if (entries[0].isIntersecting) {
                  logic.setCurrentPage(prev => prev + 1);
              }
          },
          { rootMargin: '200px' }
      );
      const currentLoader = loaderRef.current;
      if (currentLoader) observer.observe(currentLoader);
      return () => { if (currentLoader) observer.unobserve(currentLoader); };
  }, [logic.isLoading, logic.hasMore, logic.paginationStyle, logic.setCurrentPage]);

  // Modal Control State
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [promptToRemix, setPromptToRemix] = useState<Prompt | null>(null);
  const [promptForCollections, setPromptForCollections] = useState<Prompt | null>(null);
  const [promptForShowcase, setPromptForShowcase] = useState<Prompt | null>(null);
  const [reportingPrompt, setReportingPrompt] = useState<Prompt | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [deletingPrompt, setDeletingPrompt] = useState<Prompt | null>(null);
  const [sourcePromptForModal, setSourcePromptForModal] = useState<Prompt | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

  // Sync URL prompt param to modal (Handle both Route Params and Search Params)
  useEffect(() => {
      const queryPromptId = searchParams.get('prompt');
      const activePromptId = routePromptId || queryPromptId;

      if (activePromptId) {
          if (selectedPrompt && selectedPrompt.id === activePromptId) return;
          getPrompt(activePromptId)
            .then(setSelectedPrompt)
            .catch(() => {
               if (routePromptId) {
                   navigate('/', { replace: true });
               } else if (queryPromptId) {
                   const newParams = new URLSearchParams(searchParams);
                   newParams.delete('prompt');
                   setSearchParams(newParams, { replace: true });
               }
            });
      } else {
          if (selectedPrompt) setSelectedPrompt(null);
      }
  }, [routePromptId, searchParams, navigate, setSearchParams]);

  const handleOpenPromptDetail = (prompt: Prompt) => {
      // Always use route navigation for cleaner URLs (e.g. /#/prompt/123) even in hash mode
      const url = buildUrl('prompt', { promptId: prompt.id });
      navigate(url);
  };

  const handleClosePromptDetail = () => {
      setSelectedPrompt(null);
      if (routePromptId) {
          if (logic.selectedCategory !== 'All') {
               navigate(buildUrl('promptCategory', { categoryId: logic.selectedCategory }));
          } else if (logic.selectedTag) {
               navigate(buildUrl('tag', { tag: logic.selectedTag }));
          } else if (logic.debouncedSearchTerm) {
               navigate(buildUrl('search', { searchTerm: logic.debouncedSearchTerm }));
          } else {
               navigate('/');
          }
      } else {
          setSearchParams(prev => {
              const newParams = new URLSearchParams(prev);
              newParams.delete('prompt');
              return newParams;
          }, { replace: true });
      }
  };

  const handleAuthAction = (action: () => void) => {
      if (logic.currentUser) action();
      else setIsLoginModalOpen(true);
  };

  const handleFindSimilar = (prompt: Prompt) => {
      logic.handleFindSimilar(prompt);
      setSourcePromptForModal(prompt);
  };

  const containerClasses = {
    grid: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6',
    list: 'flex flex-col space-y-4',
    compact: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2',
  };

  // --- Conditional Rendering Logic ---
  // Show "Page Builder" layout if:
  // 1. homeLayout is configured in settings
  // 2. No active filters (search, category, tags, sorting) are applied
  const showHomeLayout = homeLayout.length > 0 && !isAnyFilterActive;

  // Props to pass to widget prompt cards
  const widgetCardProps = {
        categories: logic.categories,
        ratings: logic.ratings,
        favorites: logic.favorites,
        averageRatings: logic.averageRatings,
        commentCounts: logic.commentCounts,
        showcaseCounts: logic.showcaseCounts,
        onFindSimilar: handleFindSimilar,
        onRate: (p: Prompt, r: number) => handleAuthAction(() => logic.handleRatePrompt(p, r, setIsLoginModalOpen)),
        onToggleFavorite: logic.handleToggleFavorite,
        onReport: (p: Prompt) => setReportingPrompt(p),
        onRemix: (p: Prompt) => handleAuthAction(() => setPromptToRemix(p)),
        onAddToCollection: (p: Prompt) => handleAuthAction(() => setPromptForCollections(p)),
        onUploadShowcase: (p: Prompt) => handleAuthAction(() => setPromptForShowcase(p)),
        onEdit: (p: Prompt) => { setSelectedPrompt(null); setSourcePromptForModal(null); setEditingPrompt(p); },
        onDelete: setDeletingPrompt
  };

  const renderStandardGrid = () => (
      <div ref={promptListRef}>
        {(logic.isLoading && logic.prompts.length === 0) ? (
            <div className={containerClasses[logic.viewMode]}>{Array.from({ length: logic.settings.promptDisplayCount }).map((_, index) => <PromptCardSkeleton key={index} viewMode={logic.viewMode} />)}</div>
        ) : logic.prompts.length > 0 ? (
            <>
                <div className={containerClasses[logic.viewMode]}>
                    {logic.prompts.map(prompt => {
                        const avgRatingData = logic.averageRatings[prompt.id] || { average: 0, count: 0 };
                        const canManage = logic.isAdmin || (logic.currentUser && prompt.authorId === logic.currentUser.uid);
                        return (
                            <PromptCard 
                                key={prompt.id} prompt={prompt} viewMode={logic.viewMode} categories={logic.categories} 
                                onFindSimilar={handleFindSimilar} onTagClick={handleSelectTag} onCategoryClick={handleCategorySelect} 
                                userRating={logic.ratings[prompt.id] || 0} onRate={(p, r) => handleAuthAction(() => logic.handleRatePrompt(p, r, setIsLoginModalOpen))}
                                isFavorite={logic.favorites.has(prompt.id)} onToggleFavorite={logic.handleToggleFavorite} 
                                averageRating={avgRatingData.average} ratingCount={avgRatingData.count} 
                                commentCount={logic.commentCounts[prompt.id] || 0} showcaseCount={logic.showcaseCounts[prompt.id] || 0} viewCount={prompt.viewCount || 0} 
                                onClick={() => handleOpenPromptDetail(prompt)} onReport={(p) => setReportingPrompt(p)} 
                                onRemix={(p) => handleAuthAction(() => setPromptToRemix(p))} 
                                onAddToCollection={(p) => handleAuthAction(() => setPromptForCollections(p))} 
                                onUploadShowcase={(p) => handleAuthAction(() => setPromptForShowcase(p))} 
                                onEdit={(p) => { setSelectedPrompt(null); setSourcePromptForModal(null); setEditingPrompt(p); }} 
                                onDelete={setDeletingPrompt} canManage={canManage} 
                            />
                        );
                    })}
                </div>
                {logic.paginationStyle === 'pagination' && logic.totalPages > 1 && (<Pagination currentPage={logic.currentPage} totalPages={logic.totalPages} onPageChange={handlePageChange} />)}
                {logic.paginationStyle === 'infiniteScroll' && logic.hasMore && (<div ref={loaderRef} className="flex justify-center py-8">{logic.isLoading && <Spinner size="md" />}</div>)}
                {logic.paginationStyle === 'infiniteScroll' && !logic.hasMore && logic.prompts.length >= logic.settings.promptDisplayCount && (<p className="text-center text-gray-500 dark:text-gray-400 py-8">{t('home.endOfResults')}</p>)}
            </>
        ) : (
            <div className="text-center py-16 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg"><h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">{t('home.noPromptsFound')}</h2><p className="mt-2 text-gray-500 dark:text-gray-400">{t('home.noPromptsMessage')}</p>{isAnyFilterActive && (<button onClick={handleClearFilters} className="mt-4 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{t('home.clearFilters')}</button>)}</div>
        )}
      </div>
  );

  return (
    <div className="space-y-8">
      <HomeModals 
        isAIGeneratorOpen={isAIGeneratorOpen} setIsAIGeneratorOpen={setIsAIGeneratorOpen}
        isLoginModalOpen={isLoginModalOpen} setIsLoginModalOpen={setIsLoginModalOpen}
        promptToRemix={promptToRemix} setPromptToRemix={setPromptToRemix}
        handleRemixSuccess={() => { setPromptToRemix(null); logic.resetPaging(); logic.setRefetchTrigger(c => c + 1); }}
        categories={logic.categories} currentUser={logic.currentUser} userProfile={logic.userProfile} isPro={!!logic.isPro}
        promptForCollections={promptForCollections} setPromptForCollections={setPromptForCollections}
        collections={logic.collections} handleCreateCollection={logic.handleCreateCollection} handleToggleInCollection={logic.handleToggleInCollection}
        promptForShowcase={promptForShowcase} setPromptForShowcase={setPromptForShowcase} handleShowcaseSubmit={(url) => logic.handleShowcaseSubmit(url, promptForShowcase)}
        reportingPrompt={reportingPrompt} setReportingPrompt={setReportingPrompt}
        editingPrompt={editingPrompt} setEditingPrompt={setEditingPrompt} users={logic.users}
        handlePromptFormSubmit={(data) => logic.handlePromptFormSubmit(data, selectedPrompt, setSelectedPrompt).then(() => setEditingPrompt(null))}
        isActionLoading={false} isAdmin={logic.isAdmin}
        deletingPrompt={deletingPrompt} setDeletingPrompt={setDeletingPrompt}
        handleConfirmDelete={() => logic.handleConfirmDelete(deletingPrompt, selectedPrompt, setSelectedPrompt).then(() => setDeletingPrompt(null))}
        t={t}
        sourcePromptForModal={sourcePromptForModal} setSourcePromptForModal={setSourcePromptForModal}
        searchablePrompts={logic.searchablePrompts} handleFindSimilar={handleFindSimilar}
        ratings={logic.ratings} averageRatings={logic.averageRatings} handleRatePrompt={logic.handleRatePrompt}
        favorites={logic.favorites} handleToggleFavorite={logic.handleToggleFavorite}
        commentCounts={logic.commentCounts} showcaseCounts={logic.showcaseCounts}
        handlePromptClickFromSimilar={(p) => { setSourcePromptForModal(null); handleOpenPromptDetail(p); }}
        handleOpenReportModal={setReportingPrompt} handleRemixPrompt={(p) => handleAuthAction(() => setPromptToRemix(p))}
        handleAddToCollection={(p) => handleAuthAction(() => setPromptForCollections(p))}
        handleOpenShowcaseUpload={(p) => handleAuthAction(() => setPromptForShowcase(p))}
        handleEditPrompt={(p) => { setSelectedPrompt(null); setSourcePromptForModal(null); setEditingPrompt(p); }}
        handleDeletePrompt={setDeletingPrompt}
        selectedPrompt={selectedPrompt} handleClosePromptDetail={handleClosePromptDetail}
        updateCommentCount={logic.updateCommentCount} updateShowcaseCount={logic.updateShowcaseCount}
      />

      {/* Always show HomeHeader to allow searching/filtering which switches to Standard Grid */}
      <HomeHeader 
        searchInput={logic.searchInput} handleSearchChange={(e) => logic.setSearchInput(e.target.value)}
        setIsFilterPanelOpen={setIsFilterPanelOpen}
        showAIPromptIdeasButton={logic.settings.showAIPromptIdeasButton ?? true}
        handleAIGeneratorClick={() => handleAuthAction(() => setIsAIGeneratorOpen(true))}
        handleSubmitPromptClick={() => handleAuthAction(() => navigate('/submit'))}
        selectedDateFilter={logic.selectedDateFilter} handleSelectDateFilter={handleSelectDateFilter}
        sortBy={logic.sortBy} handleSortChange={(s) => logic.setSortBy(s)}
        isAnyFilterActive={isAnyFilterActive} handleClearFilters={handleClearFilters}
        commentFilter={logic.commentFilter} setCommentFilter={(v) => logic.setCommentFilter(v)}
        remixFilter={logic.remixFilter} setRemixFilter={(v) => logic.setRemixFilter(v)}
        referenceImageFilter={logic.referenceImageFilter} setReferenceImageFilter={(v) => logic.setReferenceImageFilter(v)}
        nsfwFilter={logic.nsfwFilter} setNsfwFilter={(v) => logic.setNsfwFilter(v)}
        allTags={logic.allTags} selectedTag={logic.selectedTag} handleSelectTag={handleSelectTag}
        isTagsExpanded={isTagsExpanded} setIsTagsExpanded={setIsTagsExpanded}
        TAGS_TO_SHOW_INITIAL={TAGS_TO_SHOW_INITIAL}
      />

      {showHomeLayout ? (
          <div className="space-y-12">
              {homeLayout.map(widget => {
                  switch(widget.type) {
                      case 'banner':
                          return <HeroBannerWidget key={widget.id} data={widget.data} />;
                      case 'prompt-grid':
                          return (
                            <PromptGridWidget 
                                key={widget.id} 
                                data={widget.data} 
                                categories={logic.categories}
                                onOpenDetail={handleOpenPromptDetail}
                                cardProps={widgetCardProps}
                            />
                          );
                      case 'post-grid':
                          return <PostGridWidget key={widget.id} data={widget.data} />;
                      case 'reel-grid':
                          return <ReelGridWidget key={widget.id} data={widget.data} />;
                      case 'top-contributors':
                          return <TopContributorsWidget key={widget.id} data={widget.data} />;
                      case 'rich-text':
                          return <RichTextWidget key={widget.id} data={widget.data} />;
                      case 'category-tabs':
                          return (
                              <div key={widget.id} className="my-6">
                                  <div className="hidden md:block">
                                      <CategoryTabs categories={logic.categories} selectedCategory="All" onSelectCategory={handleCategorySelect} totalPrompts={logic.totalPrompts} />
                                  </div>
                                  {/* Re-use existing mobile category logic if needed, or hide for desktop-focused tabs */}
                                  <div ref={categoryMenuRef} className="relative md:hidden flex justify-center">
                                    <button onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                        <span>{selectedCategoryName()}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                    {isCategoryMenuOpen && (
                                        <div className="absolute top-full mt-2 w-56 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-[80] ring-1 ring-black ring-opacity-5">
                                            <button onClick={() => { handleCategorySelect('All'); setIsCategoryMenuOpen(false); }} className={`w-full text-left flex justify-between items-center px-4 py-2 text-sm ${logic.selectedCategory === 'All' ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'} hover:bg-gray-100 dark:hover:bg-gray-600`}>
                                                <span>{t('common.all')}</span><span className="text-xs text-gray-500 dark:text-gray-400">{formatCount(logic.totalPrompts)}</span>
                                            </button>
                                            {(isMobileCategoryExpanded ? logic.categories : logic.categories.slice(0, MOBILE_CATEGORY_LIMIT)).map(category => (
                                                <button key={category.id} onClick={() => { handleCategorySelect(category.id); setIsCategoryMenuOpen(false); }} className={`w-full text-left flex justify-between items-center px-4 py-2 text-sm ${logic.selectedCategory === category.id ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'} hover:bg-gray-100 dark:hover:bg-gray-600`}>
                                                    <span>{category.name}</span><span className="text-xs text-gray-500 dark:text-gray-400">{formatCount(category.promptCount)}</span>
                                                </button>
                                            ))}
                                            {logic.categories.length > MOBILE_CATEGORY_LIMIT && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setIsMobileCategoryExpanded(!isMobileCategoryExpanded); }}
                                                    className="w-full text-center px-4 py-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-600 border-t border-gray-200 dark:border-gray-600 transition-colors"
                                                >
                                                    {isMobileCategoryExpanded ? t('common.collapse') : t('common.showMore', { count: logic.categories.length - MOBILE_CATEGORY_LIMIT })}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                  </div>
                              </div>
                          );
                      default:
                          return null;
                  }
              })}
          </div>
      ) : (
          <>
            <div className="flex justify-between items-center mb-4 mt-8">
                <div className="hidden md:block">
                    <CategoryTabs categories={logic.categories} selectedCategory={logic.selectedCategory} onSelectCategory={handleCategorySelect} totalPrompts={logic.totalPrompts} />
                </div>
                <div ref={categoryMenuRef} className="relative md:hidden">
                    <button onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                        <span>{selectedCategoryName()}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                    {isCategoryMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-[80] ring-1 ring-black ring-opacity-5">
                            <button onClick={() => { handleCategorySelect('All'); setIsCategoryMenuOpen(false); }} className={`w-full text-left flex justify-between items-center px-4 py-2 text-sm ${logic.selectedCategory === 'All' ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'} hover:bg-gray-100 dark:hover:bg-gray-600`}>
                                <span>{t('common.all')}</span><span className="text-xs text-gray-500 dark:text-gray-400">{formatCount(logic.totalPrompts)}</span>
                            </button>
                            {(isMobileCategoryExpanded ? logic.categories : logic.categories.slice(0, MOBILE_CATEGORY_LIMIT)).map(category => (
                                <button key={category.id} onClick={() => { handleCategorySelect(category.id); setIsCategoryMenuOpen(false); }} className={`w-full text-left flex justify-between items-center px-4 py-2 text-sm ${logic.selectedCategory === category.id ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'} hover:bg-gray-100 dark:hover:bg-gray-600`}>
                                    <span>{category.name}</span><span className="text-xs text-gray-500 dark:text-gray-400">{formatCount(category.promptCount)}</span>
                                </button>
                            ))}
                            {logic.categories.length > MOBILE_CATEGORY_LIMIT && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsMobileCategoryExpanded(!isMobileCategoryExpanded); }}
                                    className="w-full text-center px-4 py-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-600 border-t border-gray-200 dark:border-gray-600 transition-colors"
                                >
                                    {isMobileCategoryExpanded ? t('common.collapse') : t('common.showMore', { count: logic.categories.length - MOBILE_CATEGORY_LIMIT })}
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <ViewModeSwitcher currentMode={logic.viewMode} onModeChange={logic.setViewMode} />
            </div>
            {renderStandardGrid()}
          </>
      )}

      <MobileFilterPanel 
        isOpen={isFilterPanelOpen} onClose={() => setIsFilterPanelOpen(false)}
        selectedDateFilter={logic.selectedDateFilter} onSelectDateFilter={handleSelectDateFilter}
        sortBy={logic.sortBy} onSortChange={(s) => logic.setSortBy(s)}
        commentFilter={logic.commentFilter} setCommentFilter={(v) => logic.setCommentFilter(v)}
        remixFilter={logic.remixFilter} setRemixFilter={(v) => logic.setRemixFilter(v)}
        referenceImageFilter={logic.referenceImageFilter} setReferenceImageFilter={(v) => logic.setReferenceImageFilter(v)}
        nsfwFilter={logic.nsfwFilter} setNsfwFilter={(v) => logic.setNsfwFilter(v)}
        isAnyFilterActive={isAnyFilterActive} handleClearFilters={handleClearFilters}
        totalPrompts={logic.totalPrompts}
      />
    </div>
  );
};
