
export type Language = 'en' | 'vi' | 'zh' | 'ko';
export type Theme = 'light' | 'dark' | 'system';

export type UploadMethod = 'server' | 'imgbb' | 'cloudinary' | 'tumblr' | 'base64' | 'r2';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerData: { providerId: string }[];
}

// --- Widget Types ---
export type WidgetType = 'banner' | 'prompt-grid' | 'rich-text' | 'category-tabs' | 'post-grid' | 'reel-grid' | 'top-contributors' | 'featured-comments-slider' | 'community-activity';

export interface HomeWidget {
  id: string;
  type: WidgetType;
  data: any;
}

export interface BannerWidgetData {
  imageUrl: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  height?: 'small' | 'medium' | 'large';
  overlayOpacity?: number;
}

export interface PromptGridWidgetData {
  title?: string;
  categoryId?: string; // 'All' or specific ID
  tag?: string;
  sort?: 'newest' | 'oldest' | 'rating' | 'views' | 'votes';
  limit?: number;
  viewMode?: 'grid' | 'list' | 'compact' | 'slider-1' | 'slider-2';
  desktopCols?: number;
  tabletCols?: number;
  mobileCols?: number;
  customLink?: string; // New field for custom link
}

export interface TopContributorsWidgetData {
  title?: string;
  subtitle?: string;
  limit?: number;
  layout?: 'grid' | 'slider';
}

export interface RichTextWidgetData {
  content: string;
  containerClass?: string; // e.g., 'container mx-auto'
}

export interface FeaturedCommentsWidgetData {
  title?: string;
  limit?: number;
}

export interface RankingListWidgetData {
  title?: string;
  icon?: string; // 'trending' | 'heart' | 'fire' | 'bolt'
  dataSource?: 'views' | 'favorites' | 'remixes';
  limit?: number;
}

export interface CategoryRankingWidgetData {
  title?: string;
  icon?: string;
  limit?: number;
}

export interface NewCommentsWidgetData {
  title?: string;
  icon?: string;
  limit?: number;
}

export interface CommunityActivityWidgetData {
  activeTitle?: string;
  favoriteTitle?: string;
  categoryTitle?: string;
  commentTitle?: string;
  limit?: number; // Fallback limit
  activeLimit?: number;
  favoriteLimit?: number;
  categoryLimit?: number;
  commentLimit?: number;
}
// --------------------

export interface RewardPackage {
  id: string;
  points: number;
  days: number;
  label: string;
  enabled: boolean;
}

export interface PromptTextEntry {
  lang: string;
  text: string;
}

export interface GamificationSettings {
  promptFavorited: number;
  promptCollected: number;
  promptRemixed: number;
  rating5Star: number;
  commentReceived: number;
}

export interface AppSettings {
  adminPassword?: string;
  googleClientId?: string;
  promptDisplayCount: number;
  postsPerPage: number;
  relatedPostsCount: number;
  appLogoLight: string | null;
  appLogoDark: string | null;
  firebaseConfig: any;
  imageUploadMethod: UploadMethod[];
  userImageUploadMethod: UploadMethod[];
  proImageUploadMethod: UploadMethod[];
  videoUploadMethod: UploadMethod[];
  userVideoUploadMethod: UploadMethod[];
  proVideoUploadMethod: UploadMethod[];
  imgbbApiKeys: ImgbbKey[];
  cloudinaryConfigs: CloudinaryConfig[];
  tumblrConfigs: TumblrConfig[];
  r2Configs: CloudflareR2Config[];
  sepayConfig: SepayConfig;
  paypalConfig: PaypalConfig;
  proPriceVND: number;
  proPriceUSD: number;
  defaultLanguage: Language;
  languageSettings: LanguageSettings;
  defaultTheme: Theme;
  paginationStyle: 'pagination' | 'infiniteScroll';
  postsPaginationStyle: 'pagination' | 'infiniteScroll';
  defaultHomePage: string;
  routerMode: 'hash' | 'browser';
  appUrl: string;
  externalApiUrl: string;
  customBadgeIcons: Record<string, string>;
  adSettings: AdSettings;
  reelsAdSettings: AdSettings;
  reelsBannerAdSettings: BannerAdSettings;
  overlayAdSettings: OverlayAdSettings;
  topBannerAdSettings: BannerAdSettings;
  bottomBannerAdSettings: BannerAdSettings;
  sidebarTopAdSettings: BannerAdSettings;
  sidebarBottomAdSettings: BannerAdSettings;
  promptDetailAdSettings: BannerAdSettings;
  promptCardSettings: PromptCardSettings;
  permalinkSettings: PermalinkSettings;
  commentsPerPage: number;
  commentCharacterLimit: number;
  commentRateLimitSeconds: number;
  commentCooldownSeconds: number;
  commentsGloballyEnabled: boolean;
  navigationMenu: NavigationLink[];
  bottomTabMenu: BottomTabNavigationLink[];
  bottomTabNavigationStyle: BottomTabNavigationStyle;
  bottomTabNavigationEnabled: boolean;
  footerLinks: FooterLink[];
  appIntroduction: string;
  footerCopyrightText: string;
  footerDevelopedByText: string;
  footerSocialLinks: SocialLink[];
  customHeadCode: string;
  customFooterCode: string;
  showGoProButton: boolean;
  showAIPromptIdeasButton: boolean;
  registrationEnabled: boolean;
  imageUploadMaxSizeMb: number;
  headerStyle: HeaderStyle;
  headerStyleTablet: HeaderStyle;
  footerStyle: 'style1' | 'style2' | 'style3';
  cookieConsentSettings: CookieConsentSettings;
  recaptchaSettings: RecaptchaSettings;
  notificationBarSettings: NotificationBarSettings;
  watermarkSettings: WatermarkSettings;
  homeLayout?: HomeWidget[]; // New field for homepage builder
  rewardPackages: RewardPackage[]; // New field for reward packages configuration
  smtpConfig?: SmtpConfig;
  gamificationSettings?: GamificationSettings;
}

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  encryption: 'tls' | 'ssl' | 'none';
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

export interface ImgbbKey {
  id: string;
  key: string;
  enabled: boolean;
}

export interface CloudinaryConfig {
  id: string;
  cloudName: string;
  uploadPreset: string;
  enabled: boolean;
}

export interface TumblrConfig {
  id: string;
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
  blogIdentifier: string;
  enabled: boolean;
}

export interface CloudflareR2Config {
  id: string;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
  enabled: boolean;
}

export interface SepayConfig {
  storeId: string;
  secretKey: string;
  enabled: boolean;
}

export interface PaypalConfig {
  clientId: string;
  clientSecret: string;
  mode: 'sandbox' | 'live';
  enabled: boolean;
}

export interface LanguageSettings {
  en: boolean;
  vi: boolean;
  zh: boolean;
  ko: boolean;
}

export interface RecaptchaSettings {
  enabled: boolean;
  version: 'v2' | 'v3';
  v2SiteKey: string;
  v2SecretKey: string;
  v3SiteKey: string;
  v3SecretKey: string;
}

export interface NotificationBarSettings {
  enabled: boolean;
  message: string;
  buttonText?: string;
  buttonUrl?: string;
  position: 'top' | 'bottom';
  backgroundColor?: string;
  textColor?: string;
}

export interface WatermarkSettings {
  enabled: boolean;
  applyTo: UploadMethod[];
  text?: string;
  logoUrl?: string;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;
  size: number;
  repeat: boolean;
}

export interface PromptCardSettings {
  showViewCount: boolean;
  showShowcaseCount: boolean;
  showCommentCount: boolean;
  showRemixCount: boolean;
  showRatings: boolean;
  showCopyButton: boolean;
  showRemixButton: boolean;
}

export interface AdSettings {
  enabled: boolean;
  adCode: string;
  frequency: number;
  startPosition: number;
}

export interface OverlayAdSettings {
  enabled: boolean;
  adCode: string;
  trigger: 'delay' | 'scroll' | 'exit';
  delaySeconds?: number;
  scrollPercentage?: number;
  frequency: 'session' | 'daily' | 'always';
}

export interface BannerAdSettings {
  enabled: boolean;
  adCode: string;
  reappearDelayMinutes?: number;
}

export interface PermalinkSettings {
  prompt?: string;
  post?: string;
  reel?: string;
  promptCategory?: string;
  postCategory?: string;
  reelCategory?: string;
  tag?: string;
  author?: string;
  search?: string;
  postSearch?: string;
  reelSearch?: string;
  reelsExplore?: string;
  prompts?: string;
  promptsList?: string;
  community?: string;
}

export type HeaderStyle = 'style1' | 'style2' | 'style3';
export type BottomTabNavigationStyle = 'style1' | 'style2' | 'style3' | 'style4' | 'style5' | 'style6';

export interface NavigationLink {
  id: string;
  titleKey: string;
  path: string;
  order: number;
  linkType?: 'custom' | 'category' | 'post-category' | 'page';
  linkedId?: string;
  target?: '_self' | '_blank';
  parentId?: string | null;
  requiresAuth?: boolean;
  requiresGuest?: boolean;
}

export interface BottomTabNavigationLink extends NavigationLink {
  svgIcon?: string;
}

export interface FooterLink {
  id: string;
  title: string;
  url: string;
  order: number;
  target?: '_self' | '_blank';
}

export interface CookieConsentSettings {
  enabled: boolean;
  message: string;
  acceptButtonText: string;
  privacyPolicyLink: string;
}

export type Badge = 'first-contribution' | 'prolific-creator' | 'master-creator' | 'remix-artist' | 'remix-master' | 'top-rated' | 'community-favorite' | 'curator' | 'pro-user';

export type SocialPlatform = 'facebook' | 'twitter' | 'instagram' | 'youtube' | 'github' | 'linkedin' | 'runninghub' | 'other';

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
  iconUrl?: string;
  target?: '_blank' | '_self';
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  role: 'User' | 'Admin';
  photoURL?: string;
  profileBannerUrl?: string;
  bio?: string;
  isPro?: boolean;
  proExpirationDate?: string;
  points?: number;
  followerCount?: number;
  following?: Record<string, boolean>;
  badges?: Badge[];
  socialLinks?: SocialLink[];
  notificationSettings?: NotificationSettings;
}

export interface NotificationSettings {
    follow?: boolean;
    favorite?: boolean;
    collection?: boolean;
    remix?: boolean;
    comment?: boolean;
    showcase?: boolean;
    badgeUnlocked?: boolean;
    rating?: boolean;
    promptApproved?: boolean;
    promptRejected?: boolean;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
}

export interface CategoryWithCount extends Category {
  promptCount: number;
}

export interface PostCategory extends Category {}
export interface PostCategoryWithCount extends PostCategory {
  postCount: number;
}

export interface ReelCategory extends Category {}
export interface ReelCategoryWithCount extends ReelCategory {
  reelCount: number;
}

export interface Prompt {
  id: string;
  title: string;
  text: string;
  promptNote?: string;
  promptSource?: string;
  imageUrl: string;
  videoUrl?: string;
  categoryIds: string[];
  createdAt: string;
  tags?: string[];
  authorId?: string;
  authorName?: string;
  authorPhotoURL?: string;
  remixedFrom?: string;
  remixCount?: number;
  commentCount?: number;
  favoriteCount?: number;
  commentsEnabled?: boolean;
  referenceImageUrl?: string;
  requiresUserImage?: boolean;
  isPrivate?: boolean;
  isNSFW?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  viewCount?: number;
  rotation?: number;
  isRotated?: boolean; // Legacy?
}

export interface Post {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  videoUrl?: string;
  categoryIds: string[];
  tags?: string[];
  authorId?: string;
  authorName?: string;
  authorPhotoURL?: string;
  createdAt: string;
  updatedAt?: string;
  commentsEnabled?: boolean;
  status?: 'published' | 'pending' | 'private' | 'draft';
  viewCount?: number;
  commentCount?: number;
  rotation?: number;
  post_meta?: any;
}

export interface Reel {
  id: string;
  title: string;
  videoUrl: string;
  videoThumbnail?: string;
  imageUrl?: string; // JSON string of image URLs
  promptId?: string;
  authorId?: string;
  authorName?: string;
  authorPhotoURL?: string;
  createdAt: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  tags?: string[];
  categoryIds?: string[];
  status?: 'approved' | 'pending' | 'rejected';
  isNSFW?: boolean;
}

export interface Comment {
  id: string;
  promptId?: string;
  text: string;
  userId: string;
  username: string;
  userPhotoURL?: string;
  createdAt: string;
  updatedAt?: string;
  parentId?: string | null;
  replies?: Comment[];
}

export interface PostComment extends Comment {
  postId: string;
}

export interface ReelComment extends Comment {
  reelId: string;
}

export interface Report {
  id: string;
  promptId: string;
  promptText: string;
  reason: string;
  details: string;
  userId?: string;
  username?: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export interface Suggestion {
    id: string;
    userId: string;
    username: string;
    title: string;
    description: string;
    type: 'feature' | 'bug' | 'other';
    status: 'pending' | 'reviewed' | 'implemented';
    createdAt: string;
    upvotes?: number;
}

export interface ShowcaseImage {
  id: string;
  promptId: string;
  userId: string;
  username: string;
  userPhotoURL?: string;
  imageUrl: string;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  userId: string;
  promptIds?: Record<string, boolean>;
}

export type NotificationType = 'follow' | 'favorite' | 'collection' | 'remix' | 'comment' | 'showcase' | 'badge-unlocked' | 'rating' | 'prompt-approved' | 'prompt-rejected' | 'comment-reply' | 'comment-like' | 'comment-mention' | 'prompt-comment-mention' | 'ticket_created' | 'ticket_reply' | 'ticket_status';

export interface Notification {
  id: string;
  recipientId: string;
  actorId?: string;
  actorName?: string;
  actorPhotoURL?: string;
  type: NotificationType;
  promptId?: string;
  promptText?: string;
  reelId?: string;
  commentId?: string;
  commentText?: string;
  collectionName?: string;
  badgeName?: Badge;
  ratingValue?: number;
  read: boolean;
  createdAt: string;
}

export interface StaticPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TopContributor extends UserProfile {
    points: number;
}

export interface AnalyticsData {
    totalViews: number;
    totalFavorites: number;
    totalRemixes: number;
    totalCollections: number;
    totalUserPrompts: number;
    topPrompts: Prompt[];
}

export interface SupportTicket {
  id: string;
  userId: string;
  username: string;
  userEmail: string;
  subject: string;
  category: 'general' | 'billing' | 'technical' | 'report' | 'other';
  status: 'open' | 'closed' | 'resolved';
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
  lastReplyByAdmin?: boolean;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  text: string;
  isAdminReply: boolean;
  createdAt: string;
}