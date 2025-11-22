
import React, { useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
// @ts-ignore
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  getPrompts, getPosts, getCategories, getReports, getAllUsers, getStaticPages, getReels, getPostCategories,
  addPrompt as apiAddPrompt,
  updatePrompt as apiUpdatePrompt,
  deletePrompt as apiDeletePrompt,
  addPost as apiAddPost,
  updatePost as apiUpdatePost,
  deletePost as apiDeletePost,
  addReel as apiAddReel,
  updateReel as apiUpdateReel,
  deleteReel as apiDeleteReel,
  deleteReport as apiDeleteReport,
  addUser as apiAddUser,
  updateUserProfile as apiUpdateUserProfile,
  deleteUser as apiDeleteUser,
  deleteCategory as apiDeleteCategory,
  deletePostCategory as apiDeletePostCategory,
  getReelCategories,
  deleteReelCategory as apiDeleteReelCategory,
  getAllShowcaseImages,
  deleteShowcaseImage as apiDeleteShowcaseImage,
  getTickets
} from '../services/api';
import { Prompt, Post, Category, Report, UserProfile, StaticPage, Reel, PostCategory, CategoryWithCount, PostCategoryWithCount, ReelCategoryWithCount, ReelCategory, ShowcaseImage, SupportTicket } from '../types';
import Spinner from './Spinner';
import { useLanguage } from '../context/LanguageContext';

// Import tab components
import AdminPrompts from './admin/AdminPrompts';
import AdminPosts from './admin/AdminPosts';
import AdminReels from './admin/AdminReels';
import AdminShowcase from './admin/AdminShowcase';
import AdminCategories from './admin/AdminCategories';
import AdminPostCategories from './admin/AdminPostCategories';
import AdminReelCategories from './admin/AdminReelCategories';
import AdminReports from './admin/AdminReports';
import AdminUsers from './admin/AdminUsers';
import AdminPages from './admin/AdminPages';
import AdminNavigation from './admin/AdminNavigation';
import AdminSettings from './admin/AdminSettings';
import AdminAds from './admin/AdminAds';
import AdminCodeInjection from './admin/AdminCodeInjection';
import AdminData from './admin/AdminData';
import AdminAnalytics from './admin/AdminAnalytics';
import AdminPaymentGateways from './admin/AdminPaymentGateways';
import AdminPermalinks from './admin/AdminPermalinks';
import AdminSidebar from './admin/AdminSidebar';
import AdminHeader from './admin/AdminHeader';
import AdminFooter from './admin/AdminFooter';
import AdminHomepage from './admin/AdminHomepage';
import AdminSupport from './admin/AdminSupport'; // New Import
import AdminRewards from './admin/AdminRewards';
import ConfirmModal from './ConfirmModal';
import { PromptForm } from './PromptForm';
import { ReelForm } from './ReelForm';
import UserForm from './UserForm';
import { useAuth } from '../context/AuthContext';
import AdminConsent from './admin/AdminConsent';
import { AdminContext, useAdminContext } from '../context/AdminContext';

type AdminTab = 'prompts' | 'posts' | 'reels' | 'showcase' | 'reports' | 'users' | 'categories' | 'post-categories' | 'reel-categories' | 'pages' | 'settings' | 'ads' | 'data' | 'navigation' | 'codeInjection' | 'analytics' | 'paymentGateways' | 'permalinks' | 'consent' | 'homepage' | 'support' | 'rewards';

// Re-export useAdminContext for backward compatibility if needed, 
// though components should import from '../context/AdminContext' directly.
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
                    getTickets() // Fetch all support tickets for admin
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
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { prompts, posts, reels, categories, postCategories, reelCategories, reports, users, staticPages, showcaseImages, tickets, isLoading, refreshData } = useAdminContext();
  const { isPro, userProfile } = useAuth();

    const [isActionLoading, setIsActionLoading] = useState(false);

    // This effect listens for navigation state changes to automatically switch tabs.
    useEffect(() => {
        if (location.state?.action === 'edit-page') {
            setActiveTab('pages');
        }
    }, [location.state]);

    // Prompt state
    const [isPromptFormOpen, setIsPromptFormOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
    const [deletingPrompt, setDeletingPrompt] = useState<Prompt | null>(null);

    // Post state
    const [deletingPost, setDeletingPost] = useState<Post | null>(null);

    // Reel state
    const [isReelFormOpen, setIsReelFormOpen] = useState(false);
    const [editingReel, setEditingReel] = useState<Reel | null>(null);
    const [deletingReel, setDeletingReel] = useState<Reel | null>(null);
    
    // Showcase state
    const [deletingShowcaseImage, setDeletingShowcaseImage] = useState<ShowcaseImage | null>(null);

    // Report state
    const [deletingReport, setDeletingReport] = useState<Report | null>(null);

    // User state
    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);

    // Category state
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
    const [deletingPostCategory, setDeletingPostCategory] = useState<PostCategory | null>(null);
    const [deletingReelCategory, setDeletingReelCategory] = useState<ReelCategory | null>(null);

    const pendingPromptCount = useMemo(() => prompts.filter(p => p.status === 'pending').length, [prompts]);
    const pendingPostsCount = useMemo(() => posts.filter(p => p.status === 'pending').length, [posts]);
    const pendingReelsCount = useMemo(() => reels.filter(r => r.status === 'pending').length, [reels]);
    const pendingReportCount = useMemo(() => reports.filter(r => r.status === 'pending').length, [reports]);
    const openTicketCount = useMemo(() => tickets.filter(t => t.status === 'open').length, [tickets]);

    // Prompt handlers
    const handleAddPrompt = () => { setEditingPrompt(null); setIsPromptFormOpen(true); };
    const handleEditPrompt = (prompt: Prompt) => { setEditingPrompt(prompt); setIsPromptFormOpen(true); };
    const handleDeletePrompt = (id: string) => { setDeletingPrompt(prompts.find(p => p.id === id) || null); };
    const handleConfirmDeletePrompt = async () => {
        if (!deletingPrompt) return;
        setIsActionLoading(true);
        try {
            await apiDeletePrompt(deletingPrompt.id);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingPrompt(null); }
    };
    const handlePromptFormSubmit = async (formData: Prompt | Omit<Prompt, 'id' | 'createdAt'>) => {
        setIsActionLoading(true);
        try {
            if ('id' in formData) {
                await apiUpdatePrompt(formData);
            } else {
                await apiAddPrompt(formData);
            }
            refreshData();
            setIsPromptFormOpen(false);
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); }
    };

    // Post handlers
    const handleAddPost = () => { navigate('/submit-post'); };
    const handleEditPost = (post: Post) => { navigate(`/edit-post/${post.id}`); };
    const handleDeletePost = (id: string) => { setDeletingPost(posts.find(p => p.id === id) || null); };
    const handleConfirmDeletePost = async () => {
        if (!deletingPost) return;
        setIsActionLoading(true);
        try {
            await apiDeletePost(deletingPost.id);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingPost(null); }
    };

    // Reel handlers
    const handleAddReel = () => { setEditingReel(null); setIsReelFormOpen(true); };
    const handleEditReel = (reel: Reel) => { setEditingReel(reel); setIsReelFormOpen(true); };
    const handleDeleteReel = (id: string) => { setDeletingReel(reels.find(r => r.id === id) || null); };
    const handleConfirmDeleteReel = async () => {
        if (!deletingReel) return;
        setIsActionLoading(true);
        try {
            await apiDeleteReel(deletingReel.id);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingReel(null); }
    };
    const handleReelFormSubmit = async (formData: Reel | Omit<Reel, 'id' | 'createdAt' | 'likeCount' | 'viewCount'>) => {
        setIsActionLoading(true);
        try {
            if ('id' in formData) {
                await apiUpdateReel(formData);
            } else {
                if (!userProfile) throw new Error("User profile not found.");
                await apiAddReel({
                    ...formData,
                    authorId: userProfile.uid,
                    authorName: userProfile.username
                });
            }
            refreshData();
            setIsReelFormOpen(false);
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); }
    };

    // Showcase handlers
    const handleDeleteShowcaseImage = (image: ShowcaseImage) => { setDeletingShowcaseImage(image); };
    const handleConfirmDeleteShowcaseImage = async () => {
        if (!deletingShowcaseImage) return;
        setIsActionLoading(true);
        try {
            await apiDeleteShowcaseImage(deletingShowcaseImage.id, deletingShowcaseImage.userId);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingShowcaseImage(null); }
    };

    // Report handlers
    const handleGoToPrompt = (promptId: string) => {
        const prompt = prompts.find(p => String(p.id) === String(promptId));
        if (prompt) {
            setEditingPrompt(prompt);
            setIsPromptFormOpen(true);
        }
    };
    const handleDeleteReport = (id: string) => { setDeletingReport(reports.find(r => r.id === id) || null); };
    const handleConfirmDeleteReport = async () => {
        if (!deletingReport) return;
        setIsActionLoading(true);
        try {
            await apiDeleteReport(deletingReport.id);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingReport(null); }
    };
    
    // User handlers
    const handleAddUser = () => { setEditingUser(null); setIsUserFormOpen(true); };
    const handleEditUser = (user: UserProfile) => { setEditingUser(user); setIsUserFormOpen(true); };
    const handleDeleteUser = (user: UserProfile) => { setDeletingUser(user); };
    const handleConfirmDeleteUser = async () => {
        if (!deletingUser) return;
        setIsActionLoading(true);
        try {
            await apiDeleteUser(deletingUser.uid);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingUser(null); }
    };
    const handleUserFormSubmit = async (formData: UserProfile | Omit<UserProfile, 'uid'>) => {
        setIsActionLoading(true);
        try {
            if ('uid' in formData) {
                await apiUpdateUserProfile(formData.uid, formData);
            } else {
                await apiAddUser(formData);
            }
            refreshData();
            setIsUserFormOpen(false);
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); }
    };

    // Category handlers
    const handleDeleteCategory = (id: string) => { setDeletingCategory(categories.find(c => c.id === id) || null); };
    const handleConfirmDeleteCategory = async () => {
        if (!deletingCategory) return;
        setIsActionLoading(true);
        try {
            await apiDeleteCategory(deletingCategory.id);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingCategory(null); }
    };

    const handleDeletePostCategory = (id: string) => { setDeletingPostCategory(postCategories.find(c => c.id === id) || null); };
    const handleConfirmDeletePostCategory = async () => {
        if (!deletingPostCategory) return;
        setIsActionLoading(true);
        try {
            await apiDeletePostCategory(deletingPostCategory.id);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingPostCategory(null); }
    };

    const handleDeleteReelCategory = (id: string) => { setDeletingReelCategory(reelCategories.find(c => c.id === id) || null); };
    const handleConfirmDeleteReelCategory = async () => {
        if (!deletingReelCategory) return;
        setIsActionLoading(true);
        try {
            await apiDeleteReelCategory(deletingReelCategory.id);
            refreshData();
        } catch (error) { console.error(error); }
        finally { setIsActionLoading(false); setDeletingReelCategory(null); }
    };
  
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
          case 'prompts': return <AdminPrompts prompts={prompts} categories={categories} users={users} onAdd={handleAddPrompt} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} onRefresh={refreshData} />;
          case 'posts': return <AdminPosts posts={posts} categories={postCategories} users={users} onAdd={handleAddPost} onEdit={handleEditPost} onDelete={handleDeletePost} onRefresh={refreshData} />;
          case 'reels': return <AdminReels reels={reels} onAdd={handleAddReel} onEdit={handleEditReel} onDelete={handleDeleteReel} onRefresh={refreshData} />;
          case 'showcase': return <AdminShowcase showcaseImages={showcaseImages} prompts={prompts} onRefresh={refreshData} onDelete={handleDeleteShowcaseImage} />;
          case 'pages': return <AdminPages />;
          case 'reports': return <AdminReports reports={reports} prompts={prompts} onGoToPrompt={handleGoToPrompt} onDelete={handleDeleteReport} onRefresh={refreshData} />;
          case 'users': return <AdminUsers users={users} onAdd={handleAddUser} onEdit={handleEditUser} onDelete={handleDeleteUser} />;
          case 'categories': return <AdminCategories categories={categories} onDelete={handleDeleteCategory} onRefresh={refreshData} />;
          case 'post-categories': return <AdminPostCategories categories={postCategories} onDelete={handleDeletePostCategory} onRefresh={refreshData} />;
          case 'reel-categories': return <AdminReelCategories categories={reelCategories} onDelete={handleDeleteReelCategory} onRefresh={refreshData} />;
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
        {isPromptFormOpen && <PromptForm initialData={editingPrompt} categories={categories} users={users} onSubmit={handlePromptFormSubmit} onClose={() => setIsPromptFormOpen(false)} isSubmitting={isActionLoading} isUserAdmin={true} isPro={isPro} />}
        {deletingPrompt && <ConfirmModal isOpen={!!deletingPrompt} onClose={() => setDeletingPrompt(null)} onConfirm={handleConfirmDeletePrompt} title={t('modals.confirmDeleteTitle')} message={t('admin.prompts.deletePromptConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
        {deletingPost && <ConfirmModal isOpen={!!deletingPost} onClose={() => setDeletingPost(null)} onConfirm={handleConfirmDeletePost} title={t('modals.confirmDeleteTitle')} message={t('admin.posts.deleteConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
        {isReelFormOpen && <ReelForm initialData={editingReel} onSubmit={handleReelFormSubmit} onClose={() => setIsReelFormOpen(false)} isSubmitting={isActionLoading} prompts={prompts} categories={reelCategories} />}
        {deletingReel && <ConfirmModal isOpen={!!deletingReel} onClose={() => setDeletingReel(null)} onConfirm={handleConfirmDeleteReel} title={t('modals.confirmDeleteTitle')} message={t('admin.reels.deleteConfirm')} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
        {deletingShowcaseImage && <ConfirmModal isOpen={!!deletingShowcaseImage} onClose={() => setDeletingShowcaseImage(null)} onConfirm={handleConfirmDeleteShowcaseImage} title={t('admin.showcase.title')} message={t('admin.showcase.deleteConfirm', { username: deletingShowcaseImage.username })} confirmText={t('common.delete')} confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
        {deletingReport && <ConfirmModal isOpen={!!deletingReport} onClose={() => setDeletingReport(null)} onConfirm={handleConfirmDeleteReport} title="Delete Report" message="Are you sure you want to delete this report?" confirmText="Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
        {isUserFormOpen && <UserForm initialData={editingUser} onSubmit={handleUserFormSubmit} onClose={() => setIsUserFormOpen(false)} isSubmitting={isActionLoading} />}
        {deletingUser && <ConfirmModal isOpen={!!deletingUser} onClose={() => setDeletingUser(null)} onConfirm={handleConfirmDeleteUser} title="Delete User" message={`Are you sure you want to delete user ${deletingUser.username}? This cannot be undone.`} confirmText="Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
        {deletingCategory && <ConfirmModal isOpen={!!deletingCategory} onClose={() => setDeletingCategory(null)} onConfirm={handleConfirmDeleteCategory} title="Delete Category" message={`Are you sure you want to delete category "${deletingCategory.name}"? Prompts will be unassigned.`} confirmText="Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
        {deletingPostCategory && <ConfirmModal isOpen={!!deletingPostCategory} onClose={() => setDeletingPostCategory(null)} onConfirm={handleConfirmDeletePostCategory} title="Delete Post Category" message={`Are you sure you want to delete category "${deletingPostCategory.name}"? Posts will be unassigned.`} confirmText="Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}
        {deletingReelCategory && <ConfirmModal isOpen={!!deletingReelCategory} onClose={() => setDeletingReelCategory(null)} onConfirm={handleConfirmDeleteReelCategory} title="Delete Reel Category" message={`Are you sure you want to delete category "${deletingReelCategory.name}"? Reels will be unassigned.`} confirmText="Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" isConfirming={isActionLoading} />}

        
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
