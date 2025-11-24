import React, { useState } from 'react';
import { AdSettings, OverlayAdSettings, BannerAdSettings } from '../../utils/types';
import { getSettings, saveSettings } from '../../services/settingsService';
import { useLanguage } from '../../context/LanguageContext';
import Spinner from '../Spinner';

const AdSection: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        <div className="space-y-6">{children}</div>
    </div>
);

const AdminAds: React.FC = () => {
    const { t } = useLanguage();
    
    const [adSettings, setAdSettings] = useState<AdSettings>(() => getSettings().adSettings || { enabled: false, adCode: '', frequency: 12, startPosition: 4 });
    const [reelsAdSettings, setReelsAdSettings] = useState<AdSettings>(() => getSettings().reelsAdSettings || { enabled: false, adCode: '', frequency: 5, startPosition: 3 });
    const [reelsBannerAdSettings, setReelsBannerAdSettings] = useState<BannerAdSettings>(() => getSettings().reelsBannerAdSettings || { enabled: false, adCode: '', reappearDelayMinutes: 30 });
    const [overlayAdSettings, setOverlayAdSettings] = useState<OverlayAdSettings>(() => getSettings().overlayAdSettings || { enabled: false, adCode: '', trigger: 'delay', delaySeconds: 5, scrollPercentage: 50, frequency: 'session' });
    const [topBannerAdSettings, setTopBannerAdSettings] = useState<BannerAdSettings>(() => getSettings().topBannerAdSettings || { enabled: false, adCode: '' });
    const [bottomBannerAdSettings, setBottomBannerAdSettings] = useState<BannerAdSettings>(() => getSettings().bottomBannerAdSettings || { enabled: false, adCode: '' });
    const [sidebarTopAdSettings, setSidebarTopAdSettings] = useState<BannerAdSettings>(() => getSettings().sidebarTopAdSettings || { enabled: false, adCode: '' });
    const [sidebarBottomAdSettings, setSidebarBottomAdSettings] = useState<BannerAdSettings>(() => getSettings().sidebarBottomAdSettings || { enabled: false, adCode: '' });
    const [promptDetailAdSettings, setPromptDetailAdSettings] = useState<BannerAdSettings>(() => getSettings().promptDetailAdSettings || { enabled: false, adCode: '' });

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
    const [isActionLoading, setIsActionLoading] = useState(false);

    const handleApplyAdSettings = async () => {
        setIsActionLoading(true);
        try {
            await saveSettings({ adSettings, reelsAdSettings, reelsBannerAdSettings, overlayAdSettings, topBannerAdSettings, bottomBannerAdSettings, promptDetailAdSettings, sidebarTopAdSettings, sidebarBottomAdSettings });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) { console.error("Failed to save ad settings:", error); }
        finally { setIsActionLoading(false); }
    };

    const Toggle: React.FC<{checked: boolean, onChange: (val: boolean) => void, label: string, hint: string}> = ({ checked, onChange, label, hint }) => (
         <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <span className="flex-grow flex flex-col">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
        </div>
    );
    
    return (
        <div className="space-y-8">
            <AdSection title={t('admin.ads.inGridAdsTitle')}>
                <Toggle checked={adSettings.enabled} onChange={val => setAdSettings(p => ({...p, enabled: val}))} label={t('admin.ads.enable')} hint={t('admin.ads.enableHint')} />
                <div><label htmlFor="ad-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.ads.adCode')}</label><textarea id="ad-code" rows={8} value={adSettings.adCode} onChange={e => setAdSettings(p => ({...p, adCode: e.target.value}))} placeholder="<!-- Paste your ad script/HTML here -->" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600 font-mono text-sm"/><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.ads.adCodeHint')}</p></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label htmlFor="ad-frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.ads.frequency')}</label><input type="number" id="ad-frequency" value={adSettings.frequency} onChange={e => setAdSettings(p => ({...p, frequency: Number(e.target.value)}))} min="1" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"/><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.ads.frequencyHint')}</p></div>
                    <div><label htmlFor="ad-start-position" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.ads.startPosition')}</label><input type="number" id="ad-start-position" value={adSettings.startPosition} onChange={e => setAdSettings(p => ({...p, startPosition: Number(e.target.value)}))} min="1" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"/><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.ads.startPositionHint')}</p></div>
                </div>
            </AdSection>

            <AdSection title="Reels Ads">
                <Toggle checked={reelsAdSettings.enabled} onChange={val => setReelsAdSettings(p => ({...p, enabled: val}))} label={t('admin.ads.enable')} hint="Show ads between video reels." />
                <div>
                    <label htmlFor="reels-ad-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.ads.adCode')}</label>
                    <textarea id="reels-ad-code" rows={8} value={reelsAdSettings.adCode} onChange={e => setReelsAdSettings(p => ({...p, adCode: e.target.value}))} placeholder="<!-- Paste your ad script/HTML here -->" className="w-full bg-gray-100 dark:bg-gray-700 rounded-md font-mono text-sm"/>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.ads.adCodeHint')}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="reels-ad-frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.ads.frequency')}</label>
                        <input type="number" id="reels-ad-frequency" value={reelsAdSettings.frequency} onChange={e => setReelsAdSettings(p => ({...p, frequency: Number(e.target.value)}))} min="1" className="w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2"/>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Show an ad every X reels.</p>
                    </div>
                    <div>
                        <label htmlFor="reels-ad-start-position" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.ads.startPosition')}</label>
                        <input type="number" id="reels-ad-start-position" value={reelsAdSettings.startPosition} onChange={e => setReelsAdSettings(p => ({...p, startPosition: Number(e.target.value)}))} min="1" className="w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2"/>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Start showing ads after the Nth reel.</p>
                    </div>
                </div>
            </AdSection>

            <AdSection title="Reels Banner Ad">
                <Toggle checked={reelsBannerAdSettings.enabled} onChange={val => setReelsBannerAdSettings(p => ({...p, enabled: val}))} label={t('admin.ads.enable')} hint="Show a small banner ad at the bottom of the Reels player screen." />
                <div>
                    <label htmlFor="reels-banner-ad-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.ads.adCode')}</label>
                    <textarea id="reels-banner-ad-code" rows={8} value={reelsBannerAdSettings.adCode} onChange={e => setReelsBannerAdSettings(p => ({...p, adCode: e.target.value}))} placeholder="<!-- Paste your ad script/HTML here -->" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600 font-mono text-sm"/>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.ads.adCodeHint')}</p>
                </div>
                <div>
                    <label htmlFor="reels-banner-reappear" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.ads.reappearDelay')}</label>
                    <input 
                        type="number" 
                        id="reels-banner-reappear" 
                        value={reelsBannerAdSettings.reappearDelayMinutes || 30} 
                        onChange={e => setReelsBannerAdSettings(p => ({...p, reappearDelayMinutes: Number(e.target.value)}))} 
                        min="0" 
                        className="w-full bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.ads.reappearDelayHint')}</p>
                </div>
            </AdSection>

            <AdSection title={t('admin.ads.overlayAdsTitle')}>
                <Toggle checked={overlayAdSettings.enabled} onChange={val => setOverlayAdSettings(p => ({...p, enabled: val}))} label={t('admin.ads.enable')} hint="Show a pop-up ad based on a trigger." />
                <div><label htmlFor="overlay-ad-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.ads.adCode')}</label><textarea id="overlay-ad-code" rows={8} value={overlayAdSettings.adCode} onChange={e => setOverlayAdSettings(p => ({...p, adCode: e.target.value}))} placeholder="<!-- Paste your overlay ad script/HTML here -->" className="w-full bg-gray-100 dark:bg-gray-700 rounded-md font-mono text-sm"/></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label htmlFor="overlay-trigger" className="block text-sm font-medium">{t('admin.ads.overlayTrigger')}</label><select id="overlay-trigger" value={overlayAdSettings.trigger} onChange={e => setOverlayAdSettings(p => ({...p, trigger: e.target.value as any}))} className="w-full mt-1 bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2"><option value="delay">{t('admin.ads.triggerDelay')}</option><option value="scroll">{t('admin.ads.triggerScroll')}</option><option value="exit">{t('admin.ads.triggerExit')}</option></select></div>
                    {overlayAdSettings.trigger === 'delay' && <div><label htmlFor="overlay-delay" className="block text-sm font-medium">{t('admin.ads.delaySeconds')}</label><input type="number" id="overlay-delay" value={overlayAdSettings.delaySeconds} onChange={e => setOverlayAdSettings(p => ({...p, delaySeconds: Number(e.target.value)}))} min="0" className="w-full mt-1 bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2"/></div>}
                    {overlayAdSettings.trigger === 'scroll' && <div><label htmlFor="overlay-scroll" className="block text-sm font-medium">{t('admin.ads.scrollPercentage')}</label><input type="number" id="overlay-scroll" value={overlayAdSettings.scrollPercentage} onChange={e => setOverlayAdSettings(p => ({...p, scrollPercentage: Number(e.target.value)}))} min="0" max="100" className="w-full mt-1 bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2"/></div>}
                    <div><label htmlFor="overlay-frequency" className="block text-sm font-medium">{t('admin.ads.overlayFrequency')}</label><select id="overlay-frequency" value={overlayAdSettings.frequency} onChange={e => setOverlayAdSettings(p => ({...p, frequency: e.target.value as any}))} className="w-full mt-1 bg-gray-100 dark:bg-gray-700 rounded-md px-3 py-2"><option value="session">{t('admin.ads.freqSession')}</option><option value="daily">{t('admin.ads.freqDaily')}</option><option value="always">{t('admin.ads.freqAlways')}</option></select></div>
                </div>
            </AdSection>

             <AdSection title={t('admin.ads.topBannerTitle')}>
                <Toggle checked={topBannerAdSettings.enabled} onChange={val => setTopBannerAdSettings(p => ({...p, enabled: val}))} label={t('admin.ads.enable')} hint="Show a banner ad above the main content." />
                <div><label htmlFor="top-banner-ad-code" className="block text-sm font-medium">{t('admin.ads.adCode')}</label><textarea id="top-banner-ad-code" rows={8} value={topBannerAdSettings.adCode} onChange={e => setTopBannerAdSettings(p => ({...p, adCode: e.target.value}))} placeholder="<!-- Paste your top banner ad script/HTML here -->" className="w-full mt-1 bg-gray-100 dark:bg-gray-700 rounded-md font-mono text-sm"/></div>
            </AdSection>

            <AdSection title={t('admin.ads.bottomBannerTitle')}>
                <Toggle checked={bottomBannerAdSettings.enabled} onChange={val => setBottomBannerAdSettings(p => ({...p, enabled: val}))} label={t('admin.ads.enable')} hint="Show a banner ad below the main content." />
                <div><label htmlFor="bottom-banner-ad-code" className="block text-sm font-medium">{t('admin.ads.adCode')}</label><textarea id="bottom-banner-ad-code" rows={8} value={bottomBannerAdSettings.adCode} onChange={e => setBottomBannerAdSettings(p => ({...p, adCode: e.target.value}))} placeholder="<!-- Paste your bottom banner ad script/HTML here -->" className="w-full mt-1 bg-gray-100 dark:bg-gray-700 rounded-md font-mono text-sm"/></div>
            </AdSection>

            <AdSection title="Sidebar Top Ad">
                <Toggle checked={sidebarTopAdSettings.enabled} onChange={val => setSidebarTopAdSettings(p => ({...p, enabled: val}))} label={t('admin.ads.enable')} hint="Show a banner ad at the top of the right sidebar." />
                <div><label htmlFor="sidebar-top-ad-code" className="block text-sm font-medium">{t('admin.ads.adCode')}</label><textarea id="sidebar-top-ad-code" rows={8} value={sidebarTopAdSettings.adCode} onChange={e => setSidebarTopAdSettings(p => ({...p, adCode: e.target.value}))} placeholder="<!-- Paste your sidebar top ad script/HTML here -->" className="w-full mt-1 bg-gray-100 dark:bg-gray-700 rounded-md font-mono text-sm"/></div>
            </AdSection>

            <AdSection title="Sidebar Bottom Ad">
                <Toggle checked={sidebarBottomAdSettings.enabled} onChange={val => setSidebarBottomAdSettings(p => ({...p, enabled: val}))} label={t('admin.ads.enable')} hint="Show a banner ad at the bottom of the right sidebar." />
                <div><label htmlFor="sidebar-bottom-ad-code" className="block text-sm font-medium">{t('admin.ads.adCode')}</label><textarea id="sidebar-bottom-ad-code" rows={8} value={sidebarBottomAdSettings.adCode} onChange={e => setSidebarBottomAdSettings(p => ({...p, adCode: e.target.value}))} placeholder="<!-- Paste your sidebar bottom ad script/HTML here -->" className="w-full mt-1 bg-gray-100 dark:bg-gray-700 rounded-md font-mono text-sm"/></div>
            </AdSection>

            <AdSection title={t('admin.ads.promptDetailAdTitle')}>
                <Toggle checked={promptDetailAdSettings.enabled} onChange={val => setPromptDetailAdSettings(p => ({...p, enabled: val}))} label={t('admin.ads.enable')} hint="Show a banner ad inside the prompt detail modal." />
                <div><label htmlFor="prompt-detail-ad-code" className="block text-sm font-medium">{t('admin.ads.adCode')}</label><textarea id="prompt-detail-ad-code" rows={8} value={promptDetailAdSettings.adCode} onChange={e => setPromptDetailAdSettings(p => ({...p, adCode: e.target.value}))} placeholder="<!-- Paste your prompt detail ad script/HTML here -->" className="w-full mt-1 bg-gray-100 dark:bg-gray-700 rounded-md font-mono text-sm"/></div>
            </AdSection>

            <div className="pt-2"><button onClick={handleApplyAdSettings} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-md transition-colors w-full flex justify-center text-base" disabled={isActionLoading}>{isActionLoading ? <Spinner size="sm"/> : saveStatus === 'saved' ? t('admin.settings.saved') : t('admin.settings.apply')}</button></div>
        </div>
    );
};

export default AdminAds;