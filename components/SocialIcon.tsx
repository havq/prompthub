import React from 'react';
import { SocialPlatform } from '../utils/types';

interface SocialIconProps {
  platform: SocialPlatform;
  url: string;
  iconUrl?: string;
  target?: '_blank' | '_self';
}

// FIX: Replaced JSX.Element with React.ReactNode to resolve "Cannot find namespace 'JSX'" error.
const platformIcons: Record<SocialPlatform, { path: React.ReactNode; name: string }> = {
  facebook: {
    path: <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />,
    name: 'Facebook',
  },
  youtube: {
    path: <path d="M21.582 6.186a2.025 2.025 0 00-1.428-1.42C18.45 4.5 12 4.5 12 4.5s-6.45 0-8.154.266a2.025 2.025 0 00-1.428 1.42C2 7.89 2 12 2 12s0 4.11.4 5.814a2.025 2.025 0 001.428 1.42C5.55 19.5 12 19.5 12 19.5s6.45 0 8.154-.266a2.025 2.025 0 001.428-1.42c.4-1.704.4-5.814.4-5.814s0-4.11-.4-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />,
    name: 'YouTube',
  },
  twitter: {
    path: <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />,
    name: 'Twitter',
  },
  instagram: {
    path: (
      <>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </>
    ),
    name: 'Instagram',
  },
  github: {
    path: <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />,
    name: 'GitHub',
  },
  linkedin: {
    path: <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 2a2 2 0 100 4 2 2 0 000-4z" />,
    name: 'LinkedIn',
  },
  runninghub: {
      path: <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM6.5 21l1-9.5 3.5 2L12 10l3.5 4-2 6" />,
      name: 'RunningHub'
  },
  other: {
    path: <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />,
    name: 'Website',
  },
};


const SocialIcon: React.FC<SocialIconProps> = ({ platform, url, iconUrl, target = '_blank' }) => {
  const iconData = platformIcons[platform] || platformIcons.other;

  return (
    <a
      href={url}
      target={target}
      rel="noopener noreferrer"
      title={iconData.name}
      className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
    >
      {iconUrl ? (
        <img src={iconUrl} alt={iconData.name} className="h-6 w-6 rounded-md object-cover" />
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          {iconData.path}
        </svg>
      )}
      <span className="sr-only">{iconData.name}</span>
    </a>
  );
};

export default SocialIcon;