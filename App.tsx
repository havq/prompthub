import React, { useState, useEffect, Suspense, lazy } from 'react';
// @ts-ignore
import { BrowserRouter, HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { useAuth } from './context/AuthContext';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import Footer from './components/Footer';
import OverlayAd from './components/OverlayAd';
import BannerAd from './components/BannerAd';
import { AppSettings } from './types';
import { getSettings } from './services/settingsService';
import Spinner from './components/Spinner';
import { buildRoutePath } from './utils/permalinks';
import CookieConsent from './components/CookieConsent';
import NotificationBar from './components/NotificationBar';
import BottomTabNavigation from './components/BottomTabNavigation';

// Lazy load page components for code-splitting
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
// NEW: Prompts List Page
const PromptsListPage = lazy(() => import('./pages/PromptsListPage').then(module => ({ default: module.PromptsListPage })));

const PostsPage = lazy(() => import('./pages/PostsPage').then(module => ({ default: module.PostsPage })));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage').then(module => ({ default: module.default })));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
// FIX: ProfilePage is a named export
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
// FIX: CommunityPage is a named export, updated import logic
const CommunityPage = lazy(() => import('./pages/CommunityPage').then(module => ({ default: module.CommunityPage })));
const FeedPage = lazy(() => import('./pages/FeedPage').then(module => ({ default: module.FeedPage })));
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'));
const StaticPage = lazy(() => import('./pages/StaticPage'));
const ShowcasePage = lazy(() => import('./pages/ShowcasePage'));
const GoProPage = lazy(() => import('./pages/GoProPage'));
const PaymentStatusPage = lazy(() => import('./pages/PaymentStatusPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const ReelExplorePage = lazy(() => import('./pages/ReelExplorePage'));
// FIX: SubmitPromptPage is a named export
const SubmitPromptPage = lazy(() => import('./pages/SubmitPromptPage').then(module => ({ default: module.SubmitPromptPage })));
const SubmitPostPage = lazy(() => import('./pages/SubmitPostPage').then(module => ({ default: module.SubmitPostPage })));
const EditPostPage = lazy(() => import('./pages/EditPostPage').then(module => ({ default: module.EditPostPage })));
// NEW: Support Pages
const SupportPage = lazy(() => import('./pages/SupportPage'));
const SubmitTicketPage = lazy(() => import('./pages/SubmitTicketPage'));
const SupportTicketDetail = lazy(() => import('./pages/SupportTicketDetail'));
const RewardsPage = lazy(() => import('./pages/RewardsPage'));


const NOTIFICATION_BAR_DISMISSED_KEY = 'notificationBarDismissed';

const AppContent: React.FC = () => {
  const { isPro } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const location = useLocation();
  const [isNotificationBarVisible, setIsNotificationBarVisible] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const handleSettingsChange = () => {
      setSettings(getSettings());
    };
    window.addEventListener('storage', handleSettingsChange);
    return () => window.removeEventListener('storage', handleSettingsChange);
  }, []);
  
  useEffect(() => {
    const notifSettings = settings.notificationBarSettings;
    if (notifSettings?.enabled && notifSettings.position !== 'bottom') {
      try {
        const isDismissed = sessionStorage.getItem(NOTIFICATION_BAR_DISMISSED_KEY);
        if (!isDismissed) {
          setIsNotificationBarVisible(true);
        } else {
          setIsNotificationBarVisible(false);
        }
      } catch (e) {
        setIsNotificationBarVisible(true);
      }
    } else {
      setIsNotificationBarVisible(false);
    }
  }, [settings.notificationBarSettings]);

  const handleDismissNotificationBar = () => {
    try {
      sessionStorage.setItem(NOTIFICATION_BAR_DISMISSED_KEY, 'true');
    } catch(e) {
      console.error("Could not write to sessionStorage for notification bar.", e);
    }
    setIsNotificationBarVisible(false);
  };


  const { topBannerAdSettings, bottomBannerAdSettings, permalinkSettings, bottomTabNavigationEnabled } = settings;
  const isProUser = isPro;
  const hideAds = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/payment-status';
  
  // This regex will match `/reels/some-id` but not `/reels`, `/reels/`, or `/reels/explore`.
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const isReelsPlayerPage = pathSegments[0] === 'reels' && pathSegments.length > 1 && pathSegments[1] !== 'explore' && pathSegments[1] !== 'category' && pathSegments[1] !== 'search';
  
  const isAdminRoute = location.pathname.startsWith('/admin');
  const showBottomNav = (bottomTabNavigationEnabled ?? true) && !isReelsPlayerPage && !isAdminRoute && location.pathname !== '/login' && location.pathname !== '/register';
  
  const promptPath = buildRoutePath(permalinkSettings?.prompt || 'prompt/%{promptId}%');
  const postPath = buildRoutePath(permalinkSettings?.post || 'post/%{postId}%');
  const reelPath = buildRoutePath(permalinkSettings?.reel || 'reels/%{reelId}%');
  const authorPath = buildRoutePath(permalinkSettings?.author || 'author/%{authorId}%');
  const promptCategoryPath = buildRoutePath(permalinkSettings?.promptCategory || 'category/%{categoryId}%');
  const postCategoryPath = buildRoutePath(permalinkSettings?.postCategory || 'posts/category/%{categoryId}%');
  const reelCategoryPath = buildRoutePath(permalinkSettings?.reelCategory || 'reels/category/%{categoryId}%');
  const tagPath = buildRoutePath(permalinkSettings?.tag || 'tag/%{tag}%');
  const searchPath = buildRoutePath(permalinkSettings?.search || 'search/%{searchTerm}%');
  const postSearchPath = buildRoutePath(permalinkSettings?.postSearch || 'posts/search/%{searchTerm}%');
  const reelSearchPath = buildRoutePath(permalinkSettings?.reelSearch || 'reels/search/%{searchTerm}%');
  const reelsExplorePath = buildRoutePath(permalinkSettings?.reelsExplore || 'reels/explore');
  const promptsPath = buildRoutePath(permalinkSettings?.prompts || 'prompts');
  const promptsListPath = buildRoutePath(permalinkSettings?.promptsList || 'prompts-list');
  const communityPath = buildRoutePath(permalinkSettings?.community || 'community');


  return (
    <div className={`flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300`}>
      {!isReelsPlayerPage && !isAdminRoute && <Header isNotificationBarVisible={isNotificationBarVisible} />}
      <main className={`flex-grow ${!isReelsPlayerPage && !isAdminRoute ? 'container mx-auto px-4 py-8' : ''} ${showBottomNav ? 'pb-20 md:pb-8' : ''}`}>
        {!isProUser && !hideAds && !isReelsPlayerPage && !isAdminRoute && topBannerAdSettings?.enabled && topBannerAdSettings.adCode && (
          <BannerAd adCode={topBannerAdSettings.adCode} className="mt-0 mb-8" />
        )}
        <Suspense fallback={<div className="flex-grow flex items-center justify-center"><Spinner size="lg" /></div>}>
            <Routes>
              <Route path="/" element={
                  settings.defaultHomePage === 'posts' ? <PostsPage /> :
                  (settings.defaultHomePage === 'reels' || settings.defaultHomePage === 'reels/explore') ? <ReelExplorePage /> :
                  <HomePage />
              } />
              <Route path={promptsPath} element={<HomePage />} />
              <Route path={promptsListPath} element={<PromptsListPage />} />
              
              {/* Dynamic permalink routes */}
              <Route path={promptPath} element={<PromptsListPage />} />
              <Route path={postPath} element={<PostDetailPage />} />
              <Route path={reelPath} element={<ReelExplorePage />} />
              <Route path={authorPath} element={<ProfilePage />} />
              
              <Route path={promptCategoryPath} element={<PromptsListPage />} />
              <Route path={`${promptCategoryPath}/date/:dateFilter`} element={<PromptsListPage />} />
              
              <Route path={tagPath} element={<PromptsListPage />} />
              <Route path={`${tagPath}/date/:dateFilter`} element={<PromptsListPage />} />
              
              <Route path={searchPath} element={<PromptsListPage />} />
              
              <Route path="/date/:dateFilter" element={<PromptsListPage />} />
              
              <Route path="/posts" element={<PostsPage />} />
              <Route path={postCategoryPath} element={<PostsPage />} />
              <Route path={postSearchPath} element={<PostsPage />} />
              
              <Route path="/reels" element={<ReelExplorePage />} />
              <Route path={reelsExplorePath} element={<ReelExplorePage />} />
              <Route path={reelCategoryPath} element={<ReelExplorePage />} />
              <Route path={reelSearchPath} element={<ReelExplorePage />} />
              
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/showcase" element={<ShowcasePage />} />
              <Route path="/go-pro" element={<GoProPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path={communityPath} element={<CommunityPage />} />
              <Route path="/page/:slug" element={<StaticPage />} />
              <Route path="/payment-status" element={<PaymentStatusPage />} />
              
              {/* Support Routes */}
              <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
              <Route path="/support/new" element={<ProtectedRoute><SubmitTicketPage /></ProtectedRoute>} />
              <Route path="/support/:ticketId" element={<ProtectedRoute><SupportTicketDetail /></ProtectedRoute>} />

              <Route path="/rewards" element={<ProtectedRoute><RewardsPage /></ProtectedRoute>} />

              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/submit"
                element={
                  <ProtectedRoute>
                    <SubmitPromptPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/submit-post"
                element={
                  <ProtectedRoute>
                    <SubmitPostPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-post/:postId"
                element={
                  <ProtectedRoute>
                    <EditPostPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
               <Route
                path="/admin/*"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/feed"
                element={
                  <ProtectedRoute>
                    <FeedPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
        </Suspense>
      </main>
      {!isProUser && !hideAds && !isReelsPlayerPage && !isAdminRoute && bottomBannerAdSettings?.enabled && bottomBannerAdSettings.adCode && (
        <div className="container mx-auto px-4">
          <BannerAd adCode={bottomBannerAdSettings.adCode} className="mt-0 mb-6" />
        </div>
      )}
      {!isReelsPlayerPage && !isAdminRoute && <Footer />}
      {!hideAds && !isReelsPlayerPage && !isAdminRoute && <OverlayAd />}
      <CookieConsent />
      <NotificationBar isVisible={isNotificationBarVisible} onDismiss={handleDismissNotificationBar} />
      {showBottomNav && <BottomTabNavigation />}
    </div>
  );
};

function App() {
  // Initialize routerMode state with current settings value
  const [routerMode, setRouterMode] = useState<'browser' | 'hash'>(() => getSettings().routerMode);

  useEffect(() => {
    // Listen for settings changes to update router mode dynamically
    const handleSettingsChange = () => {
      const newSettings = getSettings();
      setRouterMode(newSettings.routerMode);
    };
    window.addEventListener('storage', handleSettingsChange);
    return () => window.removeEventListener('storage', handleSettingsChange);
  }, []);

  const RouterComponent = routerMode === 'browser' ? BrowserRouter : HashRouter;

  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <RouterComponent>
            <AppContent />
          </RouterComponent>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;