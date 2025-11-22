import React from 'react';
import { UserProfile, Badge } from '../../types';
import BadgeIcon from '../BadgeIcon';
import SocialIcon from '../SocialIcon';
import { calculateLevel, LevelInfo } from '../../services/gamificationService';
import { useLanguage } from '../../context/LanguageContext';

interface ProfileSidebarProps {
    userProfile: UserProfile;
    onClose?: () => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ userProfile, onClose }) => {
    const { t } = useLanguage();
    const levelInfo = calculateLevel(userProfile.points);

    const displayedBadges = React.useMemo(() => {
        const badges = new Set(userProfile.badges || []);
        if (userProfile.isPro) {
            badges.add('pro-user');
        } else {
            badges.delete('pro-user');
        }
        return Array.from(badges);
    }, [userProfile]);

    return (
        <aside className="space-y-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            {onClose && (
                <div className="flex justify-between items-center lg:hidden">
                    <h2 className="text-xl font-bold">Profile Info</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Bio</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{userProfile.bio || 'No bio provided.'}</p>
            </div>

            {levelInfo && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('profile.levelProgress')}</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                            <span>Level {levelInfo.level}</span>
                            <span>{levelInfo.points} / {levelInfo.nextLevelXp} {t('profile.xp')}</span>
                            <span>Level {levelInfo.level + 1}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${levelInfo.progress}%` }}></div>
                        </div>
                    </div>
                </div>
            )}

            {userProfile.socialLinks && userProfile.socialLinks.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Connect</h3>
                    <div className="flex flex-wrap items-center gap-6">
                        {userProfile.socialLinks.map((link, index) => <SocialIcon key={index} platform={link.platform} url={link.url} iconUrl={link.iconUrl} target={link.target} />)}
                    </div>
                </div>
            )}
            
            {displayedBadges.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('profile.badgesTitle')}</h3>
                    <div className="flex flex-wrap justify-center gap-4">{displayedBadges.map(badge => <BadgeIcon key={badge} badge={badge} size="md" />)}</div>
                </div>
            )}
        </aside>
    );
};

export default ProfileSidebar;