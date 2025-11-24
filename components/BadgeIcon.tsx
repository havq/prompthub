import React from 'react';
import { Badge } from '../utils/types';
import { useLanguage } from '../context/LanguageContext';
import { getSettings } from '../services/settingsService';

interface BadgeIconProps {
  badge: Badge;
  size?: 'sm' | 'md' | 'lg';
}

const badgeData: Record<Badge, { icon: string; titleKey: string; descriptionKey: string; color: string; }> = {
  'first-contribution': {
    icon: 'M12 7.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9z M12 4.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15z',
    titleKey: 'badges.first-contribution.title',
    descriptionKey: 'badges.first-contribution.description',
    color: 'text-green-500',
  },
  'prolific-creator': {
    icon: 'M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V17.25m12-6.75v-1.5c0-.621-.504-1.125-1.125-1.125H9.375c-.621 0-1.125.504-1.125 1.125v1.5m0-1.5V6.375c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125v2.25m0-2.25V3.375c0-.621-.504-1.125-1.125-1.125H9.375a1.125 1.125 0 00-1.125 1.125v3.375M3 14.25v-3.375c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125v3.375M3 14.25v3.375c0 .621.504 1.125 1.125-1.125h1.5a1.125 1.125 0 001.125-1.125V17.25m-6-3.375v-1.5c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125v1.5',
    titleKey: 'badges.prolific-creator.title',
    descriptionKey: 'badges.prolific-creator.description',
    color: 'text-blue-500',
  },
   'master-creator': {
    icon: 'M16.5 18.75h-9a3.375 3.375 0 01-3.375-3.375V9.375c0-1.86 1.515-3.375 3.375-3.375h9c1.86 0 3.375 1.515 3.375 3.375v5.25c0 1.86-1.515 3.375-3.375 3.375z',
    titleKey: 'badges.master-creator.title',
    descriptionKey: 'badges.master-creator.description',
    color: 'text-purple-500',
  },
  'remix-artist': {
    icon: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4-2.247 2.25 2.25 0 012.248-2.4 3 3 0 005.78-1.128 2.25 2.25 0 012.4 2.247 2.25 2.25 0 01-2.248-2.4zM13.5 10.5a3 3 0 00-5.78-1.128 2.25 2.25 0 01-2.4 2.247 2.25 2.25 0 012.248 2.4 3 3 0 005.78 1.128 2.25 2.25 0 012.4-2.247 2.25 2.25 0 01-2.248-2.4z',
    titleKey: 'badges.remix-artist.title',
    descriptionKey: 'badges.remix-artist.description',
    color: 'text-teal-500',
  },
  'remix-master': {
    icon: 'M11.42 15.17L17.25 21A2.652 2.652 0 0021 18.75V16.5M16.5 3.75V16.5M12 12.75V3.75M16.5 3.75H7.5A2.25 2.25 0 005.25 6v7.5',
    titleKey: 'badges.remix-master.title',
    descriptionKey: 'badges.remix-master.description',
    color: 'text-cyan-500',
  },
  'top-rated': {
    icon: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-3.152a.563.563 0 00-.652 0l-4.725 3.152a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
    titleKey: 'badges.top-rated.title',
    descriptionKey: 'badges.top-rated.description',
    color: 'text-yellow-500',
  },
  'community-favorite': {
     icon: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z',
     titleKey: 'badges.community-favorite.title',
     descriptionKey: 'badges.community-favorite.description',
     color: 'text-red-500',
  },
  'curator': {
     icon: 'M3.75 9.75h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5-13.5h16.5M3.75 6h16.5',
     titleKey: 'badges.curator.title',
     descriptionKey: 'badges.curator.description',
     color: 'text-orange-500',
  },
  'pro-user': {
    icon: 'M19.5 12.572l-7.5 7.428-7.5-7.428m15 0A23.052 23.052 0 0112 3.552a23.052 23.052 0 01-7.5 9.02M19.5 12.572V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5v-6.928M19.5 12.572l-7.5 7.428-7.5-7.428',
    titleKey: 'badges.pro-user.title',
    descriptionKey: 'badges.pro-user.description',
    color: 'text-amber-500',
  }
};

const BadgeIcon: React.FC<BadgeIconProps> = ({ badge, size = 'md' }) => {
  const { t } = useLanguage();
  const data = badgeData[badge];
  const settings = getSettings();
  const customIconUrl = settings.customBadgeIcons?.[badge];

  if (!data) return null;

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const title = t(data.titleKey);
  const description = t(data.descriptionKey);

  return (
    <div className="relative group flex items-center justify-center">
      {customIconUrl ? (
        <img src={customIconUrl} alt={title} className={`${sizeClasses[size]} rounded-full object-cover`} />
      ) : (
        <div className={`rounded-full p-2 bg-gray-100 dark:bg-gray-700 ${data.color}`}>
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={sizeClasses[size]}>
              <path strokeLinecap="round" strokeLinejoin="round" d={data.icon} />
          </svg>
        </div>
      )}
      <div className="absolute bottom-full mb-2 w-48 hidden group-hover:block bg-gray-800 dark:bg-gray-900 text-white text-xs rounded-lg py-2 px-3 z-10 shadow-lg">
        <p className="font-bold">{title}</p>
        <p>{description}</p>
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800 dark:border-t-gray-900"></div>
      </div>
    </div>
  );
};

export default BadgeIcon;