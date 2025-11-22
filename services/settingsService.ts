
import { AppSettings, ImgbbKey, CloudinaryConfig, TumblrConfig, SepayConfig, PaypalConfig } from '../types';
import { saveAppSettings as saveExternalSettings, getAppSettings as getExternalSettings } from './externalApi';

let settings: AppSettings | null = null;
const SETTINGS_PATH = 'settings/app_settings'; // Path in Realtime Database

const fallbackSettings: AppSettings = {
  adminPassword: "",
  promptDisplayCount: 8,
  postsPerPage: 9,
  relatedPostsCount: 5,
  appLogoLight: null,
  appLogoDark: null,
  firebaseConfig: {
    "apiKey": "AIzaSyAZBfESLd4NPf0GLg7XKSKEE5Pge4x-Hl0",
    "authDomain": "ai-project-5a473.firebaseapp.com",
    "databaseURL": "https://ai-project-5a473.firebaseio.com",
    "projectId": "ai-project-5a473",
    "storageBucket": "ai-project-5a473.appspot.com",
    "messagingSenderId": "76274775671",
    "appId": "1:76274775671:web:46e80b9009ec02c35e3872",
    "measurementId": "G-8XHYJPMGFQ"
  },
  imageUploadMethod: ['server'],
  userImageUploadMethod: ['server'],
  proImageUploadMethod: ['server'],
  videoUploadMethod: ['server'],
  userVideoUploadMethod: [],
  proVideoUploadMethod: [],
  imgbbApiKeys: [],
  cloudinaryConfigs: [],
  tumblrConfigs: [],
  sepayConfig: {
    storeId: '',
    secretKey: '',
    enabled: false
  },
  paypalConfig: {
    clientId: '',
    clientSecret: '',
    mode: 'sandbox',
    enabled: false
  },
  proPriceVND: 99000,
  proPriceUSD: 4.99,
  defaultLanguage: 'vi',
  languageSettings: {
    en: true,
    vi: true,
    zh: true,
    ko: true,
  },
  defaultTheme: 'system',
  paginationStyle: 'pagination',
  postsPaginationStyle: 'pagination',
  defaultHomePage: 'prompts',
  routerMode: 'browser',
  appUrl: '',
  externalApiUrl: '',
  customBadgeIcons: {},
  adSettings: {
    enabled: false,
    adCode: '<!-- Your ad code here -->',
    frequency: 12,
    startPosition: 4,
  },
  reelsAdSettings: {
    enabled: false,
    adCode: '<!-- Your ad code for Reels here -->',
    frequency: 5,
    startPosition: 3,
  },
  reelsBannerAdSettings: {
    enabled: false,
    adCode: '<!-- Your small banner ad code for Reels here -->',
    reappearDelayMinutes: 30,
  },
  overlayAdSettings: {
    enabled: false,
    adCode: '',
    trigger: 'delay',
    delaySeconds: 5,
    scrollPercentage: 50,
    frequency: 'session',
  },
  topBannerAdSettings: {
    enabled: false,
    adCode: '<!-- Your top banner ad code here -->',
  },
  bottomBannerAdSettings: {
    enabled: false,
    adCode: '<!-- Your bottom banner ad code here -->',
  },
  sidebarTopAdSettings: {
    enabled: false,
    adCode: '<!-- Your sidebar top ad code here -->',
  },
  sidebarBottomAdSettings: {
    enabled: false,
    adCode: '<!-- Your sidebar bottom ad code here -->',
  },
  promptDetailAdSettings: {
    enabled: false,
    adCode: '<!-- Your prompt detail ad code here -->',
  },
  promptCardSettings: {
    showViewCount: true,
    showShowcaseCount: true,
    showCommentCount: true,
    showRemixCount: true,
    showRatings: true,
    showCopyButton: true,
    showRemixButton: true,
  },
  permalinkSettings: {
    prompt: 'prompt/%{promptId}%',
    post: 'post/%{postId}%',
    reel: 'reels/%{reelId}%',
    promptCategory: 'category/%{categoryId}%',
    postCategory: 'posts/category/%{categoryId}%',
    reelCategory: 'reels/category/%{categoryId}%',
    tag: 'tag/%{tag}%',
    author: 'author/%{authorId}%',
    search: 'search/%{searchTerm}%',
    postSearch: 'posts/search/%{searchTerm}%',
    reelSearch: 'reels/search/%{searchTerm}%',
    reelsExplore: 'reels/explore',
    prompts: 'prompts',
    promptsList: 'prompts-list',
    community: 'community',
  },
  commentsPerPage: 10,
  commentCharacterLimit: 500,
  commentRateLimitSeconds: 30,
  commentCooldownSeconds: 3,
  commentsGloballyEnabled: true,
  navigationMenu: [
    { id: 'feed', titleKey: 'header.feed', path: '/feed', order: 0, requiresAuth: true },
    { id: 'community', titleKey: 'header.community', path: '/community', order: 1 },
    { id: 'collections', titleKey: 'header.collections', path: '/collections', order: 2 },
  ],
  bottomTabMenu: [],
  bottomTabNavigationStyle: 'style1',
  bottomTabNavigationEnabled: true,
  footerLinks: [],
  appIntroduction: 'Your go-to hub for discovering, sharing, and creating with the best AI prompts. Dive into a world of endless creativity and inspiration.',
  footerCopyrightText: '© {year} AI Prompthub. All Rights Reserved.',
  footerDevelopedByText: 'Developed by <a href="https://prompthub.today" target="_blank" rel="noopener noreferrer" class="font-semibold text-indigo-400 hover:underline">HAVQ</a>.',
  footerSocialLinks: [],
  customHeadCode: '',
  customFooterCode: '',
  showGoProButton: true,
  showAIPromptIdeasButton: true,
  registrationEnabled: true,
  imageUploadMaxSizeMb: 10,
  headerStyle: 'style1',
  headerStyleTablet: 'style1',
  footerStyle: 'style1',
  cookieConsentSettings: {
    enabled: false,
    message: 'We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.',
    acceptButtonText: 'Got it!',
    privacyPolicyLink: '/page/privacy-policy'
  },
  recaptchaSettings: {
    enabled: false,
    version: 'v2',
    v2SiteKey: '',
    v2SecretKey: '',
    v3SiteKey: '',
    v3SecretKey: '',
  },
  notificationBarSettings: {
    enabled: false,
    message: 'This is a sample notification message!',
    buttonText: 'Learn More',
    buttonUrl: '#',
    position: 'top',
    backgroundColor: '#1f2937', // gray-800
    textColor: '#ffffff'
  },
  watermarkSettings: {
    enabled: false,
    applyTo: ['cloudinary', 'tumblr', 'imgbb', 'server'],
    text: 'prompthub.today',
    logoUrl: '',
    position: 'bottom-right',
    opacity: 70,
    size: 15,
    repeat: false,
  },
  homeLayout: [],
  rewardPackages: [
      { id: 'pro_3_days', points: 500, days: 3, label: '3 Days Pro', enabled: true },
      { id: 'pro_7_days', points: 1000, days: 7, label: '7 Days Pro', enabled: true },
      { id: 'pro_30_days', points: 3000, days: 30, label: '30 Days Pro', enabled: true },
  ],
};

export const loadSettings = async (): Promise<AppSettings> => {
    // Default fallback: Assume local PHP server or AI Studio environment
    let apiUrl = "https://api.prompthub.today"; 
    
    // Check for Cloudflare Pages environment or Production
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // Updated to include 'pages.dev' so Cloudflare Pages deployments properly use the /api proxy
        if (hostname.includes('prompthub.today') || hostname.includes('workers.dev') || hostname.includes('pages.dev')) {
            //apiUrl = "/api";
        }
    }
    
    // Allow environment variable override (Highest Priority)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) {
        apiUrl = (import.meta as any).env.VITE_API_URL;
    } else if (typeof process !== 'undefined' && process.env && process.env.API_URL) {
        apiUrl = process.env.API_URL;
    }
    
    // Step 2: Initialize the global settings object with fallbacks and the determined API URL.
    settings = { ...fallbackSettings, externalApiUrl: apiUrl };

    // Step 3: Fetch live settings from the determined external API.
    try {
        const apiSettings: any = await getExternalSettings();

        const keysToParse: (keyof AppSettings)[] = [
            'footerSocialLinks', 'footerLinks', 'navigationMenu', 'bottomTabMenu', 'customBadgeIcons',
            'adSettings', 'reelsAdSettings', 'reelsBannerAdSettings', 'overlayAdSettings',
            'topBannerAdSettings', 'bottomBannerAdSettings', 'sidebarTopAdSettings',
            'sidebarBottomAdSettings', 'promptDetailAdSettings', 'promptCardSettings',
            'permalinkSettings',
            'cookieConsentSettings',
            'languageSettings',
            'recaptchaSettings',
            'imgbbApiKeys', 'cloudinaryConfigs', 'tumblrConfigs', 'sepayConfig', 'paypalConfig',
            'imageUploadMethod', 'userImageUploadMethod', 'proImageUploadMethod',
            'videoUploadMethod', 'userVideoUploadMethod', 'proVideoUploadMethod',
            'notificationBarSettings',
            'watermarkSettings',
            'homeLayout',
            'rewardPackages',
        ];

        for (const key of keysToParse) {
            if (apiSettings[key] && typeof apiSettings[key] === 'string') {
                try {
                    (apiSettings as any)[key] = JSON.parse(apiSettings[key] as string);
                } catch (e) {
                    console.error(`Failed to parse setting '${key}' from API response:`, e);
                    (apiSettings as any)[key] = (settings as any)[key]; // Use existing value on parse error
                }
            }
        }
        
        // Migration for legacy array-based configs
        if (apiSettings.sepayConfigs && Array.isArray(apiSettings.sepayConfigs)) {
            apiSettings.sepayConfig = apiSettings.sepayConfigs[0] || settings.sepayConfig;
            delete apiSettings.sepayConfigs;
        }
        if (apiSettings.paypalConfigs && Array.isArray(apiSettings.paypalConfigs)) {
            apiSettings.paypalConfig = apiSettings.paypalConfigs[0] || settings.paypalConfig;
            delete apiSettings.paypalConfigs;
        }

        // Step 4: Merge API settings on top, as they have the highest precedence.
        settings = { ...settings, ...apiSettings };
    } catch (e) {
        console.error("Could not fetch settings from external API. Using local/fallback settings.", e);
    }

    // --- MIGRATION LOGIC for old single-value keys ---
    if ((settings as any).imgbbApiKey && (!settings.imgbbApiKeys || settings.imgbbApiKeys.length === 0)) {
        settings.imgbbApiKeys = [{ id: 'migrated-1', key: (settings as any).imgbbApiKey, enabled: true }];
    }
    delete (settings as any).imgbbApiKey;
    
    if ((settings as any).cloudinaryCloudName && (settings as any).cloudinaryUploadPresets && (!settings.cloudinaryConfigs || settings.cloudinaryConfigs.length === 0)) {
        settings.cloudinaryConfigs = ((settings as any).cloudinaryUploadPresets as string[]).map((preset: string, index: number) => ({
            id: `migrated-cld-${index}`,
            cloudName: (settings as any).cloudinaryCloudName as string,
            uploadPreset: preset,
            enabled: true
        }));
    }
    delete (settings as any).cloudinaryCloudName;
    delete (settings as any).cloudinaryUploadPresets;

    if ((settings as any).tumblrConsumerKey && (!settings.tumblrConfigs || settings.tumblrConfigs.length === 0)) {
        settings.tumblrConfigs = [{
            id: 'migrated-tmb-1',
            consumerKey: (settings as any).tumblrConsumerKey,
            consumerSecret: (settings as any).tumblrConsumerSecret || '',
            token: (settings as any).tumblrToken || '',
            tokenSecret: (settings as any).tumblrTokenSecret || '',
            blogIdentifier: (settings as any).tumblrBlogIdentifier || '',
            enabled: true
        }];
    }
    delete (settings as any).tumblrConsumerKey;
    delete (settings as any).tumblrConsumerSecret;
    delete (settings as any).tumblrToken;
    delete (settings as any).tumblrTokenSecret;
    delete (settings as any).tumblrBlogIdentifier;

    // --- SANITIZATION: Ensure arrays/objects exist ---
    settings.imgbbApiKeys = settings.imgbbApiKeys || [];
    settings.cloudinaryConfigs = settings.cloudinaryConfigs || [];
    settings.tumblrConfigs = settings.tumblrConfigs || [];
    settings.imageUploadMethod = settings.imageUploadMethod || [];
    settings.userImageUploadMethod = settings.userImageUploadMethod || [];
    settings.proImageUploadMethod = settings.proImageUploadMethod || [];
    settings.videoUploadMethod = settings.videoUploadMethod || [];
    settings.userVideoUploadMethod = settings.userVideoUploadMethod || [];
    settings.proVideoUploadMethod = settings.proVideoUploadMethod || [];
    settings.sepayConfig = settings.sepayConfig || fallbackSettings.sepayConfig;
    settings.paypalConfig = settings.paypalConfig || fallbackSettings.paypalConfig;
    settings.navigationMenu = settings.navigationMenu || fallbackSettings.navigationMenu;
    settings.bottomTabMenu = settings.bottomTabMenu || fallbackSettings.bottomTabMenu;
    settings.bottomTabNavigationEnabled = settings.bottomTabNavigationEnabled ?? fallbackSettings.bottomTabNavigationEnabled;
    settings.permalinkSettings = { ...fallbackSettings.permalinkSettings, ...settings.permalinkSettings };
    settings.cookieConsentSettings = { ...fallbackSettings.cookieConsentSettings, ...settings.cookieConsentSettings };
    settings.languageSettings = { ...fallbackSettings.languageSettings, ...settings.languageSettings };
    settings.recaptchaSettings = { ...fallbackSettings.recaptchaSettings, ...settings.recaptchaSettings };
    settings.notificationBarSettings = { ...fallbackSettings.notificationBarSettings, ...settings.notificationBarSettings };
    settings.watermarkSettings = { ...fallbackSettings.watermarkSettings, ...settings.watermarkSettings };
    settings.homeLayout = settings.homeLayout || [];
    settings.rewardPackages = settings.rewardPackages || fallbackSettings.rewardPackages;

    window.dispatchEvent(new Event('storage'));
    return settings;
};

export const getSettings = (): AppSettings => {
  if (!settings) {
    // console.warn("getSettings called before loadSettings completed. Returning fallback settings.");
    return fallbackSettings;
  }
  return { ...settings };
};

export const saveSettings = async (newSettings: Partial<Omit<AppSettings, 'firebaseConfig' | 'adminPassword'>>) => {
  if (!settings) {
    throw new Error("Attempted to save settings before they were loaded.");
  }

  const updatedSettings = { ...getSettings(), ...newSettings };
  settings = updatedSettings;
  
  const settingsForApi: any = { ...newSettings };

  const keysToStringify: (keyof AppSettings)[] = [
    'footerSocialLinks', 'footerLinks', 'navigationMenu', 'bottomTabMenu',
    'adSettings', 'overlayAdSettings', 'topBannerAdSettings', 'bottomBannerAdSettings',
    'promptDetailAdSettings', 'customBadgeIcons', 'homeLayout', 'rewardPackages'
  ];

  keysToStringify.forEach(key => {
      if (key in settingsForApi && typeof settingsForApi[key] === 'object' && settingsForApi[key] !== null) {
          settingsForApi[key] = JSON.stringify(settingsForApi[key]);
      }
  });

  try {
    await saveExternalSettings(settingsForApi);
  } catch (e) {
    console.error("Failed to save settings to External API:", e);
    throw e;
  }

  window.dispatchEvent(new Event('storage'));
};
