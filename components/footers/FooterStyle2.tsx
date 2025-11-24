import React, { useState, useEffect, useCallback } from 'react';
import { getSettings } from '../../services/settingsService';
import { AppSettings } from '../../utils/types';
import SocialIcon from '../SocialIcon';
import { Link } from 'react-router-dom';

const FooterStyle2: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [appSettings, setAppSettings] = useState<AppSettings>(() => getSettings());
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false);

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

  useEffect(() => {
    const handleSettingsChange = () => setAppSettings(getSettings());
    const toggleVisibility = () => setIsBackToTopVisible(window.pageYOffset > 300);
    
    window.addEventListener('storage', handleSettingsChange);
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('storage', handleSettingsChange);
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const displayedLogo = appSettings.appLogoDark;

  return (
    <>
      <footer className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 z-30" aria-labelledby="footer-heading">
        <h2 id="footer-heading" className="sr-only">Footer</h2>
        <div className="container mx-auto px-4 py-12 flex flex-col items-center text-center space-y-6">
            {displayedLogo ? (
                <img src={displayedLogo} alt="App Logo" className="h-10 object-contain" />
            ) : (
                <div className="text-2xl font-bold text-gray-800 dark:text-white">Prompthub</div>
            )}

            {Array.isArray(appSettings.footerLinks) && appSettings.footerLinks.length > 0 && (
                <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                    {appSettings.footerLinks.sort((a,b) => a.order - b.order).map(link => {
                        const isInternal = link.url.startsWith('/');
                        return (
                            <li key={link.id}>
                                {isInternal ? (
                                    <Link to={link.url} target={link.target || '_self'} rel={link.target === '_blank' ? 'noopener noreferrer' : undefined} className="text-sm hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                        {link.title}
                                    </Link>
                                ) : (
                                    <a href={link.url} target={link.target || '_self'} rel="noopener noreferrer" className="text-sm hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                        {link.title}
                                    </a>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {Array.isArray(appSettings.footerSocialLinks) && appSettings.footerSocialLinks.length > 0 && (
                <div className="flex justify-center space-x-6">
                    {appSettings.footerSocialLinks.map((link, index) => (
                        <SocialIcon key={index} platform={link.platform} url={link.url} target={link.target} />
                    ))}
                </div>
            )}
            
            <p className="text-xs">
                {appSettings.footerCopyrightText?.replace('{year}', String(currentYear))}
            </p>
        </div>
      </footer>
      {isBackToTopVisible && (
          <button onClick={scrollToTop} className="fixed bottom-[65] right-2 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-transform hover:scale-110 duration-300 z-40" aria-label="Back to top">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </button>
      )}
    </>
  );
};

export default FooterStyle2;