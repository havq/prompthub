import React, { useState, useEffect, useCallback } from 'react';
import { getSettings } from '../../services/settingsService';
import { AppSettings } from '../../utils/types';
import SocialIcon from '../SocialIcon';
import { Link } from 'react-router-dom';

const FooterStyle3: React.FC = () => {
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

  const exploreLinks = [
    { title: 'Prompts', path: '/prompts' },
    { title: 'Posts', path: '/posts' },
    { title: 'Community', path: '/community' },
    { title: 'Showcase', path: '/showcase' },
  ];

  const aboutLinks = (appSettings.footerLinks || []).sort((a,b) => a.order - b.order);

  return (
    <>
      <footer className="bg-gray-900 text-gray-400 z-30" aria-labelledby="footer-heading">
        <h2 id="footer-heading" className="sr-only">Footer</h2>
        <div className="container mx-auto px-4 pt-16 pb-8">
            <div className="xl:grid xl:grid-cols-3 xl:gap-8">
                <div className="space-y-8 xl:col-span-1">
                    {displayedLogo ? (
                        <img src={displayedLogo} alt="App Logo" className="h-9 object-contain" />
                    ) : (
                        <div className="text-2xl font-bold text-white">Prompthub</div>
                    )}
                    <p className="text-sm text-gray-300">{appSettings.appIntroduction}</p>
                    {Array.isArray(appSettings.footerSocialLinks) && appSettings.footerSocialLinks.length > 0 && (
                        <div className="flex space-x-6">
                            {appSettings.footerSocialLinks.map((link, index) => (
                                <SocialIcon key={index} platform={link.platform} url={link.url} target={link.target} />
                            ))}
                        </div>
                    )}
                </div>
                <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
                    <div className="md:grid md:grid-cols-2 md:gap-8">
                        <div>
                            <h3 className="text-sm font-semibold leading-6 text-white">Explore</h3>
                            <ul role="list" className="mt-6 space-y-4">
                                {exploreLinks.map(link => (
                                    <li key={link.path}>
                                        <Link to={link.path} className="text-sm leading-6 hover:text-white">{link.title}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="mt-10 md:mt-0">
                            <h3 className="text-sm font-semibold leading-6 text-white">About</h3>
                             <ul role="list" className="mt-6 space-y-4">
                                {aboutLinks.map(link => {
                                    const isInternal = link.url.startsWith('/');
                                    return (
                                        <li key={link.id}>
                                            {isInternal ? (
                                                <Link to={link.url} target={link.target} rel={link.target === '_blank' ? 'noopener noreferrer' : undefined} className="text-sm leading-6 hover:text-white">{link.title}</Link>
                                            ) : (
                                                <a href={link.url} target={link.target} rel="noopener noreferrer" className="text-sm leading-6 hover:text-white">{link.title}</a>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                    <div className="md:grid md:grid-cols-1 md:gap-8">
                        <div>
                            <h3 className="text-sm font-semibold leading-6 text-white">Subscribe to our newsletter</h3>
                            <p className="mt-2 text-sm leading-6 text-gray-300">The latest news, articles, and resources, sent to your inbox weekly.</p>
                            <form className="mt-6 sm:flex sm:max-w-md">
                                <label htmlFor="email-address" className="sr-only">Email address</label>
                                <input type="email" name="email-address" id="email-address" autoComplete="email" required className="w-full min-w-0 appearance-none rounded-md border-0 bg-white/5 px-3 py-1.5 text-base text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:w-64 sm:text-sm sm:leading-6 xl:w-full" placeholder="Enter your email" />
                                <div className="mt-4 sm:ml-4 sm:mt-0 sm:flex-shrink-0">
                                    <button type="submit" className="flex w-full items-center justify-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">Subscribe</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-16 border-t border-white/10 pt-8 sm:mt-20 lg:mt-24">
                <p className="text-xs leading-5 text-gray-400">&copy; {currentYear} Prompthub, Inc. All rights reserved.</p>
            </div>
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

export default FooterStyle3;