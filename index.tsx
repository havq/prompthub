


import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { getSettings, loadSettings } from './services/settingsService';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const AppInitializer: React.FC = () => {
    const [initialized, setInitialized] = useState(false);
    const [refresher, setRefresher] = useState(0);

    useEffect(() => {
        loadSettings().then(() => {
            const settings = getSettings();

            // Update Favicon
            if (settings.faviconUrl) {
                let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'icon';
                    document.head.appendChild(link);
                }
                link.href = settings.faviconUrl;
            }
            
            // Apply SEO Settings
            if (settings.siteTitle) {
                document.title = settings.siteTitle;
            }

            const updateMeta = (name: string, content: string | undefined) => {
                if (!content) return;
                let meta = document.querySelector(`meta[name="${name}"]`);
                if (!meta) {
                    meta = document.createElement('meta');
                    meta.setAttribute('name', name);
                    document.head.appendChild(meta);
                }
                meta.setAttribute('content', content);
            };

            updateMeta('description', settings.siteDescription);
            updateMeta('keywords', settings.siteKeywords);

            // Apply Custom CSS
            if (settings.customCss) {
                const cssId = 'prompthub-custom-css';
                let style = document.getElementById(cssId);
                if (!style) {
                    style = document.createElement('style');
                    style.id = cssId;
                    document.head.appendChild(style);
                }
                style.textContent = settings.customCss;
            }

            // Function to inject code and execute scripts
            const injectCode = (code: string | undefined, target: 'head' | 'body') => {
                if (!code) return;

                const targetElement = target === 'head' ? document.head : document.body;
                
                const template = document.createElement('template');
                template.innerHTML = code.trim();
                
                const fragment = document.createDocumentFragment();
                
                Array.from(template.content.childNodes).forEach(node => {
                    if (node.nodeName === 'SCRIPT') {
                        const script = document.createElement('script');
                        const oldScript = node as HTMLScriptElement;
                        // FIX: Directly iterate over attributes to ensure correct type inference for 'attr'.
                        for (const attr of oldScript.attributes) {
                            script.setAttribute(attr.name, attr.value);
                        }
                        script.textContent = oldScript.textContent;
                        fragment.appendChild(script);
                    } else {
                        fragment.appendChild(node.cloneNode(true));
                    }
                });

                targetElement.appendChild(fragment);
            };

            injectCode(settings.customHeadCode, 'head');
            injectCode(settings.customFooterCode, 'body');
            
            setInitialized(true);
        }).catch(error => {
            console.error("Failed to initialize app:", error);
            // You could show an error message to the user here
        });
    }, [refresher]);

    // Listen to settings changes to re-apply dynamic assets
    useEffect(() => {
        const handleSettingsChange = () => {
            const settings = getSettings();
            
            // Favicon
            if (settings.faviconUrl) {
                let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'icon';
                    document.head.appendChild(link);
                }
                link.href = settings.faviconUrl;
            }
            
            // SEO
            if (settings.siteTitle) {
                document.title = settings.siteTitle;
            }
            
            const updateMeta = (name: string, content: string | undefined) => {
                if (!content) return;
                let meta = document.querySelector(`meta[name="${name}"]`);
                if (!meta) {
                    meta = document.createElement('meta');
                    meta.setAttribute('name', name);
                    document.head.appendChild(meta);
                }
                meta.setAttribute('content', content);
            };
            updateMeta('description', settings.siteDescription);
            updateMeta('keywords', settings.siteKeywords);

            // Custom CSS
            if (settings.customCss) {
                const cssId = 'prompthub-custom-css';
                let style = document.getElementById(cssId);
                if (!style) {
                    style = document.createElement('style');
                    style.id = cssId;
                    document.head.appendChild(style);
                }
                style.textContent = settings.customCss;
            }
            
            // Re-triggering injectCode is complex as it appends duplicate scripts. 
            // Only reversible/safe attributes are re-applied here.
        };
        window.addEventListener('storage', handleSettingsChange);
        return () => window.removeEventListener('storage', handleSettingsChange);
    }, []);


    if (!initialized) {
        // A minimal, inline i18n for the pre-loading screen
        const browserLang = navigator.language.split(/[-_]/)[0];
        const loadingTexts = {
            vi: { title: 'Đang tải ứng dụng...', subtitle: 'Đang chuẩn bị trải nghiệm của bạn.' },
            zh: { title: '正在加载应用程序...', subtitle: '正在准备您的体验。' },
            ko: { title: '애플리케이션 로딩 중...', subtitle: '경험을 준비 중입니다.' },
            en: { title: 'Loading Application...', subtitle: 'Preparing your experience.' }
        };
        
        const loadingText = loadingTexts[browserLang as keyof typeof loadingTexts] || loadingTexts.en;

        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white font-sans">
                <div className="text-center flex flex-col items-center gap-4">
                    <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <div>
                        <p className="text-xl font-semibold">{loadingText.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{loadingText.subtitle}</p>
                    </div>
                </div>
            </div>
        );
    }

    return <App />;
};

root.render(
  <React.StrictMode>
    <AppInitializer />
  </React.StrictMode>
);
