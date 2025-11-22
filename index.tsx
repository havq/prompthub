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

    useEffect(() => {
        loadSettings().then(() => {
            const settings = getSettings();

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
    }, []);

    if (!initialized) {
        // A minimal, inline i18n for the pre-loading screen
        const browserLang = navigator.language.split(/[-_]/)[0];
        const loadingText = browserLang === 'vi' 
            ? { title: 'Đang tải ứng dụng...', subtitle: 'Đang chuẩn bị trải nghiệm của bạn.' }
            : { title: 'Loading Application...', subtitle: 'Preparing your experience.' };

        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white font-sans">
                <div className="text-center">
                    <p className="text-xl">{loadingText.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{loadingText.subtitle}</p>
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