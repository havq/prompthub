
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { getSettings } from '../services/settingsService';

const CheckIcon = () => (
    <svg className="w-6 h-6 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
);

const CrossIcon = () => (
    <svg className="w-6 h-6 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const GoProPage: React.FC = () => {
    const { t, language } = useLanguage();
    const { isPro, userProfile } = useAuth();
    const { proPriceVND, proPriceUSD } = getSettings();
    const navigate = useNavigate();

    const features = [
        { key: 'browsePublic', free: true, pro: true },
        { key: 'createPublic', free: true, pro: true },
        { key: 'saveCollections', free: true, pro: true },
        { key: 'rateComment', free: true, pro: true },
        { key: 'uploadVideo', free: false, pro: true },
        { key: 'adFree', free: false, pro: true },
        { key: 'privatePrompts', free: false, pro: true },
        { key: 'profileCustomization', free: false, pro: true },
        { key: 'proBadge', free: false, pro: true },
        { key: 'prioritySupport', free: false, pro: true },
        { key: 'earlyAccess', free: false, pro: true },
    ];

    // Base prices from settings (Assuming settings store the Lifetime/Full price)
    const baseVND = proPriceVND || 99000;
    const baseUSD = proPriceUSD || 4.99;

    // Calculate Monthly prices (approx 10-15% of lifetime or custom logic)
    const monthlyVND = Math.floor(baseVND / 10 / 1000) * 1000; // Round to thousands
    const monthlyUSD = Number((baseUSD / 10).toFixed(2));

    // Check if user has a Lifetime plan (Pro is true, but no expiration date)
    // If they have an expiration date, they are on a temporary plan (rewards/monthly) and can upgrade.
    const isLifetime = isPro && !userProfile?.proExpirationDate;

    const handleSelectPlan = (plan: 'monthly' | 'lifetime') => {
        navigate('/checkout', {
            state: {
                selectedPlan: {
                    id: plan,
                    name: plan === 'monthly' ? 'Monthly Plan' : 'Lifetime Access',
                    priceVND: plan === 'monthly' ? monthlyVND : baseVND,
                    priceUSD: plan === 'monthly' ? monthlyUSD : baseUSD,
                    description: plan === 'monthly' ? 'Valid for 30 days' : 'One-time payment, forever',
                    days: plan === 'monthly' ? 30 : 0 // 0 implies lifetime
                }
            }
        });
    };

    return (
        <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                    {t('goPro.headline')}
                </h1>
                <p className="mt-5 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400">
                    {t('goPro.subheading')}
                </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
                {/* Monthly Plan */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 flex flex-col relative overflow-hidden transition-transform hover:scale-105 duration-300">
                    <h3 className="text-xl font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Monthly</h3>
                    <div className="my-4 flex items-baseline text-gray-900 dark:text-white">
                        <span className="text-5xl font-extrabold tracking-tight">
                            {language === 'vi' ? (monthlyVND / 1000) + 'k' : '$' + monthlyUSD}
                        </span>
                        <span className="ml-1 text-xl font-semibold text-gray-500 dark:text-gray-400">/mo</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Perfect for short-term projects and trying out Pro features.</p>
                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-center text-gray-600 dark:text-gray-300">
                            <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path></svg>
                            Full Pro Access
                        </li>
                        <li className="flex items-center text-gray-600 dark:text-gray-300">
                            <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path></svg>
                            Cancel anytime
                        </li>
                    </ul>
                    {isLifetime ? (
                         <button disabled className="w-full block bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 font-bold py-3 px-4 rounded-xl text-center cursor-not-allowed">
                            {t('goPro.alreadyPro')}
                        </button>
                    ) : (
                        <button onClick={() => handleSelectPlan('monthly')} className="w-full block bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-bold py-3 px-4 rounded-xl text-center transition-colors">
                            {isPro ? 'Extend Monthly' : 'Choose Monthly'}
                        </button>
                    )}
                </div>

                {/* Lifetime Plan */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-indigo-500 p-8 flex flex-col relative overflow-hidden transform scale-105 md:scale-110 z-10">
                    <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase">
                        Best Value
                    </div>
                    <h3 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Lifetime</h3>
                    <div className="my-4 flex items-baseline text-gray-900 dark:text-white">
                        <span className="text-5xl font-extrabold tracking-tight">
                             {language === 'vi' ? (baseVND / 1000) + 'k' : '$' + baseUSD}
                        </span>
                        <span className="ml-1 text-xl font-semibold text-gray-500 dark:text-gray-400">/once</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Pay once, own it forever. No recurring fees.</p>
                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-center text-gray-600 dark:text-gray-300">
                            <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path></svg>
                            All Features
                        </li>
                        <li className="flex items-center text-gray-600 dark:text-gray-300">
                            <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path></svg>
                            Lifetime Updates
                        </li>
                        <li className="flex items-center text-gray-600 dark:text-gray-300">
                            <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path></svg>
                            Priority Support
                        </li>
                    </ul>
                     {isLifetime ? (
                         <button disabled className="w-full block bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 font-bold py-3 px-4 rounded-xl text-center cursor-not-allowed">
                            {t('goPro.alreadyPro')}
                        </button>
                    ) : (
                        <button onClick={() => handleSelectPlan('lifetime')} className="w-full block bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl text-center shadow-lg transition-all hover:shadow-xl">
                            {isPro ? 'Upgrade to Lifetime' : 'Get Lifetime Access'}
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Feature Comparison</h3>
                </div>
                
                {/* Desktop Table */}
                <table className="w-full hidden md:table">
                    <thead className="bg-gray-50 dark:bg-gray-900/30">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('goPro.feature')}</th>
                            <th scope="col" className="w-1/4 px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {t('goPro.free')}
                            </th>
                            <th scope="col" className="w-1/4 px-6 py-4 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                {t('goPro.pro')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {features.map((feature) => (
                            <tr key={feature.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">{t(`goPro.features.${feature.key}`)}</td>
                                <td className="px-6 py-4 text-center">{feature.free ? <CheckIcon /> : <CrossIcon />}</td>
                                <td className="px-6 py-4 text-center bg-indigo-50/30 dark:bg-indigo-900/10">{feature.pro ? <CheckIcon /> : <CrossIcon />}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {/* Mobile View */}
                 <div className="md:hidden p-4 space-y-2">
                    {features.map((feature) => (
                        <div key={feature.key} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                            <p className="font-semibold text-gray-900 dark:text-white mb-3 text-center">{t(`goPro.features.${feature.key}`)}</p>
                            <div className="grid grid-cols-2 gap-4 text-center divide-x divide-gray-200 dark:divide-gray-600">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">{t('goPro.free')}</p>
                                    {feature.free ? <CheckIcon /> : <CrossIcon />}
                                </div>
                                <div className="pl-4">
                                    <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase mb-2">{t('goPro.pro')}</p>
                                    {feature.pro ? <CheckIcon /> : <CrossIcon />}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {isLifetime && (
                <div className="mt-12 text-center">
                     <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">{t('goPro.alreadyPro')}</h2>
                     <p className="text-gray-500 dark:text-gray-400">{t('goPro.thanks')}</p>
                     <div className="mt-6">
                         <Link to="/" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Go back to Home</Link>
                     </div>
                </div>
            )}
        </div>
    );
};

export default GoProPage;
