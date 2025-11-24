import React, { useState } from 'react';
import { SepayConfig, PaypalConfig } from '../../utils/types';
import { getSettings, saveSettings } from '../../services/settingsService';
import { useLanguage } from '../../context/LanguageContext';
import Spinner from '../Spinner';

const AdminPaymentGateways: React.FC = () => {
    const { t } = useLanguage();
    
    const [sepayConfig, setSepayConfig] = useState<SepayConfig>(() => getSettings().sepayConfig || { storeId: '', secretKey: '', enabled: false });
    const [paypalConfig, setPaypalConfig] = useState<PaypalConfig>(() => getSettings().paypalConfig || { clientId: '', clientSecret: '', mode: 'sandbox', enabled: false });
    const [proPriceVND, setProPriceVND] = useState<number>(() => getSettings().proPriceVND || 99000);
    const [proPriceUSD, setProPriceUSD] = useState<number>(() => getSettings().proPriceUSD || 4.99);
    
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
    const [isActionLoading, setIsActionLoading] = useState(false);

    const handleSepayChange = (field: keyof SepayConfig, value: any) => {
        setSepayConfig(prev => ({ ...prev, [field]: value }));
    };
    
    const handlePaypalChange = (field: keyof PaypalConfig, value: any) => {
        setPaypalConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleApplyPaymentSettings = async () => {
        setIsActionLoading(true);
        try {
            await saveSettings({ sepayConfig, paypalConfig, proPriceVND, proPriceUSD });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Failed to save payment settings:", error);
            alert(`Failed to save payment settings:\n${error}`);
        } finally {
            setIsActionLoading(false);
        }
    };
    
    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4">{t('admin.payment.title')}</h3>
                <div className="space-y-6">
                    {/* PRICING SECTION */}
                    <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                        <h4 className="font-semibold text-gray-800 dark:text-white">{t('admin.payment.proPriceTitle')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                                <label htmlFor="pro-price-vnd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.payment.proPriceVND')}</label>
                                <input type="number" id="pro-price-vnd" value={proPriceVND} onChange={e => setProPriceVND(Number(e.target.value))} step="1000" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2"/>
                            </div>
                            <div>
                                <label htmlFor="pro-price-usd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.payment.proPriceUSD')}</label>
                                <input type="number" id="pro-price-usd" value={proPriceUSD} onChange={e => setProPriceUSD(Number(e.target.value))} step="0.01" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2"/>
                            </div>
                        </div>
                    </div>
                    {/* SEPAY UI */}
                    <div className="pt-4 mt-4">
                        <h4 className="font-semibold text-gray-800 dark:text-white">SePay Payment Gateway</h4>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Configure SePay credentials to enable Pro account upgrades.</p>
                        <div className="space-y-2 mt-3">
                            <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md space-y-2 border border-gray-200 dark:border-gray-600">
                                <input type="text" placeholder="Store ID" value={sepayConfig.storeId} onChange={e => handleSepayChange('storeId', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"/>
                                <input type="password" placeholder="Secret Key" value={sepayConfig.secretKey} onChange={e => handleSepayChange('secretKey', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"/>
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sepayConfig.enabled} onChange={e => handleSepayChange('enabled', e.target.checked)} className="h-4 w-4 rounded" /> Enabled</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* PAYPAL UI */}
                     <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                        <h4 className="font-semibold text-gray-800 dark:text-white">PayPal Payment Gateway</h4>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Configure PayPal credentials for international payments.</p>
                        <div className="space-y-2 mt-3">
                            <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md space-y-2 border border-gray-200 dark:border-gray-600">
                                <input type="text" placeholder="Client ID" value={paypalConfig.clientId} onChange={e => handlePaypalChange('clientId', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"/>
                                <input type="password" placeholder="Client Secret" value={paypalConfig.clientSecret} onChange={e => handlePaypalChange('clientSecret', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm"/>
                                <select value={paypalConfig.mode} onChange={e => handlePaypalChange('mode', e.target.value)} className="w-full bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm">
                                    <option value="sandbox">Sandbox (Testing)</option>
                                    <option value="live">Live (Production)</option>
                                </select>
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={paypalConfig.enabled} onChange={e => handlePaypalChange('enabled', e.target.checked)} className="h-4 w-4 rounded" /> Enabled</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="pt-2">
                <button onClick={handleApplyPaymentSettings} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-md transition-colors w-full flex justify-center text-base" disabled={isActionLoading}>
                    {isActionLoading ? <Spinner size="sm"/> : saveStatus === 'saved' ? t('admin.settings.saved') : t('admin.settings.apply')}
                </button>
            </div>
        </div>
    );
};

export default AdminPaymentGateways;