import React, { useState, useEffect, useCallback } from 'react';
import { getSettings } from '../../services/settingsService';
import { AppSettings } from '../../utils/types';
import SocialIcon from '../SocialIcon';
import { Link } from 'react-router-dom';


const FooterStyle1: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [appSettings, setAppSettings] = useState<AppSettings>(() => getSettings());
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  useEffect(() => {
    const handleSettingsChange = () => {
        setAppSettings(getSettings());
    };
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsBackToTopVisible(true);
      } else {
        setIsBackToTopVisible(false);
      }
    };
    
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
      <footer className="bg-gray-950 text-gray-400 z-30" aria-labelledby="footer-heading">
        <h2 id="footer-heading" className="sr-only">Footer</h2>
        <div className="container mx-auto px-4">

          <div className="py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* About Section */}
              <div className="lg:col-span-6 space-y-4 text-center lg:text-left">
                  {displayedLogo ? (
                      <img src={displayedLogo} alt="App Logo" className="h-10 object-contain mx-auto lg:mx-0" />
                  ) : (
                      <div className="text-2xl font-bold text-white flex items-center justify-center lg:justify-start">
                          <span>Prompt</span><span className="bg-orange-500 text-gray-900 px-2 py-0.5 rounded-md ml-2">hub</span>
                      </div>
                  )}
                  {appSettings.appIntroduction && (
                      <p className="text-sm max-w-md mx-auto lg:mx-0">
                          {appSettings.appIntroduction}
                      </p>
                  )}
              </div>

              {/* Links & Connect Group */}
              <div className="lg:col-span-6 grid grid-cols-2 gap-8 mt-10 pt-8 border-t border-gray-700 lg:mt-0 lg:pt-0 lg:border-t-0">
                  {/* Links Section */}
                  <div>
                      <h3 className="text-sm font-semibold leading-6 text-white">Links</h3>
                      <ul role="list" className="mt-4 space-y-2">
                          {(appSettings.footerLinks && appSettings.footerLinks.length > 0) ? appSettings.footerLinks.sort((a,b) => a.order - b.order).map(link => {
                                const isInternal = link.url.startsWith('/');
                                if (isInternal) {
                                    return (
                                        <li key={link.id}>
                                            <Link
                                                to={link.url}
                                                target={link.target || '_self'}
                                                rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
                                                className="text-sm leading-6 hover:text-white"
                                            >
                                                {link.title}
                                            </Link>
                                        </li>
                                    );
                                }
                                return (
                                    <li key={link.id}>
                                        <a 
                                            href={link.url}
                                            target={link.target || '_self'} 
                                            rel="noopener noreferrer" 
                                            className="text-sm leading-6 hover:text-white"
                                        >
                                            {link.title}
                                        </a>
                                    </li>
                                );
                            }) : (
                              <>
                                <li><a href="#" className="text-sm leading-6 hover:text-white">Facebook</a></li>
                                <li><a href="#" className="text-sm leading-6 hover:text-white">Youtube</a></li>
                                <li><a href="#" className="text-sm leading-6 hover:text-white">Twitter</a></li>
                              </>
                          )}
                      </ul>
                  </div>
                  
                  {/* Social Section */}
                  <div>
                       <h3 className="text-sm font-semibold leading-6 text-white">Connect</h3>
                       {Array.isArray(appSettings.footerSocialLinks) && appSettings.footerSocialLinks.length > 0 ? (
                          <div className="flex mt-4 space-x-6">
                              {appSettings.footerSocialLinks.map((link, index) => (
                                 <SocialIcon key={index} platform={link.platform} url={link.url} target={link.target} />
                              ))}
                          </div>
                      ) : (
                          <div className="flex mt-4 space-x-6">
                              <SocialIcon platform="facebook" url="#" />
                              <SocialIcon platform="twitter" url="#" />
                              <SocialIcon platform="github" url="#" />
                          </div>
                      )}
                  </div>
              </div>
          </div>
          
          <div className="border-t border-gray-700 py-8">
              <div className="text-center md:flex md:justify-between">
                  <p className="text-xs leading-5">
                     {appSettings.footerCopyrightText?.replace('{year}', String(currentYear))}
                  </p>
                   {appSettings.footerDevelopedByText && (
                        <p 
                            className="text-xs leading-5 mt-4 md:mt-0"
                            dangerouslySetInnerHTML={{ __html: appSettings.footerDevelopedByText }}
                        />
                   )}
              </div>
          </div>
        </div>
      </footer>
      {isBackToTopVisible && (
          <button
              onClick={scrollToTop}
              className="fixed bottom-[65] right-2 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-transform hover:scale-110 duration-300 z-40"
              aria-label="Back to top"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
          </button>
      )}
    </>
  );
};

export default FooterStyle1;