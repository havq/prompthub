
import React, { useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  getPrompts, getPosts, getCategories, getReports, getAllUsers, getStaticPages, getReels, getPostCategories,
  getReelCategories, getAllShowcaseImages, getTickets
} from '../../services/api';
import { Prompt, Post, Reel, Report, UserProfile, StaticPage, CategoryWithCount, PostCategoryWithCount, ReelCategoryWithCount, ShowcaseImage, SupportTicket } from '../../utils/types';
import Spinner from '../Spinner';
import { useLanguage } from '../../context/LanguageContext';

// Import tab components
import AdminPrompts from './AdminPrompts';
import AdminPosts from './AdminPosts';
import AdminReels from './AdminReels';
import AdminShowcase from './AdminShowcase';
import AdminCategories from './AdminCategories';
import AdminPostCategories from './AdminPostCategories';
import AdminReelCategories from './AdminReelCategories';
import AdminReports from './AdminReports';
import AdminUsers from './AdminUsers';
import AdminPages from './AdminPages';
import AdminNavigation from './AdminNavigation';
import AdminSettings from './AdminSettings';
import AdminAds from './AdminAds';
import AdminCodeInjection from './AdminCodeInjection';
import AdminData from './AdminData';
import AdminAnalytics from './AdminAnalytics';
import AdminPaymentGateways from './AdminPaymentGateways';
import AdminPermalinks from './AdminPermalinks';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AdminFooter from './AdminFooter';
import AdminHomepage from './AdminHomepage';
import AdminSupport from './AdminSupport';
import AdminRewards from './AdminRewards';
import AdminConsent from './AdminConsent';

// Import Logic and Modals Wrapper
import { AdminContext, useAdminContext } from '../../context/AdminContext';
import { useAdminActions } from '../../hooks/useAdminActions';
import AdminModals from './AdminModals';

type AdminTab = 'prompts' | 'posts' | 'reels' | 'showcase' | 'reports' | 'users' | 'categories' | 'post-categories' | 'reel-categories' | 'pages' | 'settings' | 'ads' | 'data' | 'navigation' | 'codeInjection' | 'analytics' | 'paymentGateways' | 'permalinks' | 'consent' | 'homepage' | 'support' | 'rewards';

// Re-export useAdminContext for backward compatibility
export { useAdminContext };

const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [reels, setReels] = useState<Reel[]>([]);
    const [categories, setCategories] = useState<CategoryWithCount[]>([]);
    const [postCategories, setPostCategories] = useState<PostCategoryWithCount[]>([]);
    const [reelCategories, setReelCategories] = useState<ReelCategoryWithCount[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [staticPages, setStaticPages] = useState<StaticPage[]>([]);
    const [showcaseImages, setShowcaseImages] = useState<ShowcaseImage[]>([]);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refresher, setRefresher] = useState(0);

    const refreshData = useCallback(() => setRefresher(c => c + 1), []);

    useEffect(() => {
        const fetchAllAdminData = async () => {
            setIsLoading(true);
            try {
                const [promptsResponse, postsResponse, reelsResponse, categoriesData, postCategoriesData, reelCategoriesData, reportsData, usersData, pagesData, showcaseData, ticketsData] = await Promise.all([
                    getPrompts({ page: 1, limit: 100000, sortBy: 'newest', isAdmin: true }),
                    getPosts({ page: 1, limit: 100000, sortBy: 'newest', isAdmin: true }),
                    getReels({ page: 1, limit: 100000 }),
                    getCategories(),
                    getPostCategories(),
                    getReelCategories(),
                    getReports(),
                    getAllUsers(),
                    getStaticPages(),
                    getAllShowcaseImages(),
                    getTickets()
                ]);

                setPrompts(promptsResponse.prompts);
                setPosts(postsResponse.posts);
                setReels(reelsResponse.reels);
                setCategories(categoriesData);
                setPostCategories(postCategoriesData);
                setReelCategories(reelCategoriesData);
                setReports(reportsData);
                setUsers(usersData);
                setStaticPages(pagesData);
                setShowcaseImages(showcaseData);
                setTickets(ticketsData);
            } catch (e) {
                console.error("Failed to fetch admin data:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllAdminData();
    }, [refresher]);

    const value = { prompts, posts, reels, categories, postCategories, reelCategories, reports, users, staticPages, showcaseImages, tickets, isLoading, refreshData };

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
};

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<AdminTab>(location.state?.defaultTab || 'analytics');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t } = useLanguage();
  
  // Consume Context
  const { prompts, posts, reels, categories, postCategories, reelCategories, reports, users, tickets, isLoading, refreshData } = useAdminContext();
  
  // Use the Refactored Actions Hook
  const actions = useAdminActions();

  useEffect(() => {
      if (location.state?.action === 'edit-page') {
          setActiveTab('pages');
      }
  }, [location.state]);

  const pendingPromptCount = useMemo(() => prompts.filter(p => p.status === 'pending').length, [prompts]);
  const pendingPostsCount = useMemo(() => posts.filter(p => p.status === 'pending').length, [posts]);
  const pendingReelsCount = useMemo(() => reels.filter(r => r.status === 'pending').length, [reels]);
  const pendingReportCount = useMemo(() => reports.filter(r => r.status === 'pending').length, [reports]);
  const openTicketCount = useMemo(() => tickets.filter(t => t.status === 'open').length, [tickets]);
  
  const tabTitles: Record<AdminTab, string> = {
      analytics: t('admin.analytics.title'),
      prompts: t('admin.prompts.title'),
      posts: t('admin.posts.title'),
      reels: t('admin.reels.title'),
      showcase: t('admin.showcase.title'),
      pages: t('admin.pages.title'),
      reports: t('admin.reports.title'),
      users: t('admin.users.title'),
      categories: 'Prompt ' + t('admin.categories.title'),
      'post-categories': 'Post ' + t('admin.categories.title'),
      'reel-categories': 'Reel ' + t('admin.categories.title'),
      navigation: t('admin.navigation.title'),
      settings: t('admin.settings.title'),
      paymentGateways: t('admin.payment.title'),
      ads: t('admin.ads.title'),
      codeInjection: t('admin.codeInjection.title'),
      data: t('admin.data.title'),
      permalinks: 'Permalinks',
      consent: 'Consent Management',
      homepage: 'Homepage Builder',
      support: 'Support Tickets',
      rewards: 'Rewards Options',
  };

  const renderTabContent = () => {
      if (isLoading) {
          return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
      }
      switch(activeTab) {
          case 'analytics': return <AdminAnalytics />;
          case 'prompts': return <AdminPrompts prompts={prompts} categories={categories} users={users} onAdd={actions.handleAddPrompt} onEdit={actions.handleEditPrompt} onDelete={actions.handleDeletePrompt} onRefresh={refreshData} />;
          case 'posts': return <AdminPosts posts={posts} categories={postCategories} users={users} onAdd={actions.handleAddPost} onEdit={actions.handleEditPost} onDelete={actions.handleDeletePost} onRefresh={refreshData} />;
          case 'reels': return <AdminReels reels={reels} onAdd={actions.handleAddReel} onEdit={actions.handleEditReel} onDelete={actions.handleDeleteReel} onRefresh={refreshData} />;
          case 'showcase': return <AdminShowcase />;
          case 'pages': return <AdminPages />;
          case 'reports': return <AdminReports reports={reports} prompts={prompts} onGoToPrompt={actions.handleGoToPrompt} onDelete={actions.handleDeleteReport} onRefresh={refreshData} />;
          case 'users': return <AdminUsers users={users} onAdd={actions.handleAddUser} onEdit={actions.handleEditUser} onDelete={actions.handleDeleteUser} />;
          case 'categories': return <AdminCategories categories={categories} onDelete={actions.handleDeleteCategory} onRefresh={refreshData} />;
          case 'post-categories': return <AdminPostCategories categories={postCategories} onDelete={actions.handleDeletePostCategory} onRefresh={refreshData} />;
          case 'reel-categories': return <AdminReelCategories categories={reelCategories} onDelete={actions.handleDeleteReelCategory} onRefresh={refreshData} />;
          case 'navigation': return <AdminNavigation />;
          case 'settings': return <AdminSettings />;
          case 'paymentGateways': return <AdminPaymentGateways />;
          case 'ads': return <AdminAds />;
          case 'codeInjection': return <AdminCodeInjection />;
          case 'data': return <AdminData prompts={prompts} categories={categories} onRefresh={refreshData} />;
          case 'permalinks': return <AdminPermalinks />;
          case 'consent': return <AdminConsent />;
          case 'homepage': return <AdminHomepage />;
          case 'support': return <AdminSupport />;
          case 'rewards': return <AdminRewards />;
          default: return null;
      }
  }

  return (
      <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
        <AdminModals 
            prompts={prompts}
            categories={categories}
            users={users}
            reelCategories={reelCategories}
            {...actions}
        />

        <AdminSidebar
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingReportCount={pendingReportCount}
          pendingPromptCount={pendingPromptCount}
          pendingPostsCount={pendingPostsCount}
          pendingReelsCount={pendingReelsCount}
          openTicketCount={openTicketCount}
        />

        <div className="lg:pl-72 flex flex-col min-h-screen">
            <AdminHeader setSidebarOpen={setIsSidebarOpen} activeTabTitle={tabTitles[activeTab]} />

            <main className="flex-grow">
                <div className="px-4 sm:px-6 lg:px-8 py-8">
                    {renderTabContent()}
                </div>
            </main>

            <AdminFooter />
        </div>
      </div>
  );
};

const AdminDashboardWrapper: React.FC = () => (
    <AdminProvider>
        <AdminDashboard />
    </AdminProvider>
);

export default AdminDashboardWrapper;
