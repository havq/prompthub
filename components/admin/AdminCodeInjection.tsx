import React, { useState } from 'react';
import { getSettings, saveSettings } from '../../services/settingsService';
import { useLanguage } from '../../context/LanguageContext';
import Spinner from '../Spinner';

const AdminCodeInjection: React.FC = () => {
    const { t } = useLanguage();
    const [customHeadCode, setCustomHeadCode] = useState<string>(() => getSettings().customHeadCode || '');
    const [customFooterCode, setCustomFooterCode] = useState<string>(() => getSettings().customFooterCode || '');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
    const [isActionLoading, setIsActionLoading] = useState(false);

    const handleApplyCodeInjectionSettings = async () => {
        setIsActionLoading(true);
        try {
            await saveSettings({ customHeadCode, customFooterCode });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) { console.error("Failed to save code injection settings:", error); } 
        finally { setIsActionLoading(false); }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4">{t('admin.codeInjection.title')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('admin.codeInjection.subtitle')}</p>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="custom-head-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.codeInjection.headTitle')}</label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2" dangerouslySetInnerHTML={{ __html: t('admin.codeInjection.headSubtitle') }} />
                        <textarea id="custom-head-code" rows={8} value={customHeadCode} onChange={e => setCustomHeadCode(e.target.value)} placeholder={t('admin.codeInjection.headPlaceholder')} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600 font-mono text-sm" />
                    </div>
                    <div>
                        <label htmlFor="custom-footer-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.codeInjection.footerTitle')}</label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2" dangerouslySetInnerHTML={{ __html: t('admin.codeInjection.footerSubtitle') }} />
                        <textarea id="custom-footer-code" rows={8} value={customFooterCode} onChange={e => setCustomFooterCode(e.target.value)} placeholder={t('admin.codeInjection.footerPlaceholder')} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600 font-mono text-sm" />
                    </div>
                </div>
            </div>
            <div className="pt-2"><button onClick={handleApplyCodeInjectionSettings} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-md transition-colors w-full flex justify-center text-base" disabled={isActionLoading}>{isActionLoading ? <Spinner size="sm"/> : saveStatus === 'saved' ? t('admin.settings.saved') : t('admin.settings.apply')}</button></div>
        </div>
    );
};

export default AdminCodeInjection;
