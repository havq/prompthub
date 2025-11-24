
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, RewardPackage } from '../../utils/types';
import { redeemPro } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../Spinner';
import { useLanguage } from '../../context/LanguageContext';
import { getSettings } from '../../services/settingsService';

interface UserRewardsProps {
    userProfile: UserProfile;
}

const UserRewards: React.FC<UserRewardsProps> = ({ userProfile }) => {
    const { refetchUserProfile } = useAuth();
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [isRedeeming, setIsRedeeming] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    
    const settings = getSettings();
    const packages = (settings.rewardPackages || []).filter(p => p.enabled);

    const currentPoints = userProfile.points || 0;

    // Check if user has an active Pro subscription
    const isProActive = useMemo(() => {
        if (!userProfile.isPro) return false;
        // If isPro is true but no expiration date, assume lifetime/permanent or valid
        if (!userProfile.proExpirationDate) return true; 
        // Check if expiration date is in the future
        return new Date(userProfile.proExpirationDate) > new Date();
    }, [userProfile]);

    // Check if user has a Lifetime plan (no expiration date)
    const isLifetime = userProfile.isPro && !userProfile.proExpirationDate;

    const { proPriceVND, proPriceUSD } = settings;
    const priceDisplay = language === 'vi'
      ? `${(proPriceVND || 99000).toLocaleString('vi-VN')} VNĐ`
      : `$${(proPriceUSD || 4.99).toFixed(2)}`;

    const handleRedeem = async (pkgId: string) => {
        setIsRedeeming(pkgId);
        setMessage(null);
        try {
            await redeemPro(pkgId);
            await refetchUserProfile();
            setMessage({ type: 'success', text: t('profile.rewards.redeemSuccess') });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || t('profile.rewards.redeemError') });
        } finally {
            setIsRedeeming(null);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('profile.rewards.title')}</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">{t('profile.rewards.subtitle')}</p>
                <div className="mt-4 inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-full font-bold text-lg">
                    <span>💎</span>
                    <span>{currentPoints.toLocaleString()} {t('profile.pointsStat')}</span>
                </div>
                {isProActive && (
                    <div className="mt-4 p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-md text-sm">
                        Current Plan Active Until: {userProfile.proExpirationDate ? new Date(userProfile.proExpirationDate).toLocaleDateString() : 'Lifetime'}
                    </div>
                )}
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-md text-center ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {packages.map((pkg) => {
                    const canAfford = currentPoints >= pkg.points;
                    // Disable if:
                    // 1. User cannot afford
                    // 2. A redemption is in progress
                    // 3. User has a Lifetime plan (cannot upgrade further)
                    const isDisabled = !canAfford || !!isRedeeming || isLifetime;
                    
                    return (
                        <div key={pkg.id} className={`border rounded-xl p-6 flex flex-col items-center transition-all ${isDisabled ? 'border-gray-200 dark:border-gray-700 opacity-60 grayscale' : 'border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-indigo-500 dark:hover:border-indigo-500'}`}>
                            <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg">
                                {pkg.days}D
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{pkg.label}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('profile.rewards.accessToPro')}</p>
                            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-6">{pkg.points} pts</div>
                            
                            <button
                                onClick={() => handleRedeem(pkg.id)}
                                disabled={isDisabled}
                                className={`w-full py-2 px-4 rounded-md font-semibold transition-colors flex justify-center items-center ${
                                    isDisabled
                                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : isProActive
                                            ? 'bg-green-600 hover:bg-green-700 text-white' // Green for extend/upgrade
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                            >
                                {isRedeeming === pkg.id ? <Spinner size="sm" /> : isLifetime ? "Lifetime Plan" : isProActive ? `Extend (+${pkg.days} days)` : t('profile.rewards.redeemButton')}
                            </button>
                        </div>
                    );
                })}
                
                {/* Lifetime Plan Card */}
                <div className={`border rounded-xl p-6 flex flex-col items-center transition-all border-gray-200 dark:border-gray-700 ${isLifetime ? 'opacity-60 grayscale' : 'hover:shadow-md hover:border-purple-500 dark:hover:border-purple-500'}`}>
                    <div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg">
                        ∞
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Lifetime Pro</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">Permanent access</p>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-6">{priceDisplay}</div>
                    
                    <button
                        onClick={() => navigate('/go-pro')}
                        disabled={isLifetime}
                        className={`w-full py-2 px-4 rounded-md font-semibold transition-colors flex justify-center items-center ${
                            isLifetime
                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                        }`}
                    >
                        {isLifetime ? "Plan Active" : "Buy Now"}
                    </button>
                </div>

                {packages.length === 0 && (
                    <div className="col-span-full text-center text-gray-500 dark:text-gray-400">
                        No point reward packages available at this time.
                    </div>
                )}
            </div>
            
            <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>{t('profile.rewards.footerNote')}</p>
            </div>
        </div>
    );
};

export default UserRewards;
