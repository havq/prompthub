import React, { useState, useMemo } from 'react';
import { Report, Prompt } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { updateReport } from '../../services/api';

interface AdminReportsProps {
    reports: Report[];
    prompts: Prompt[];
    onGoToPrompt: (promptId: string) => void;
    onDelete: (id: string) => void;
    onRefresh: () => void;
}

const reasonKeyMap: Record<string, string> = {
    'inappropriate': 'inappropriate',
    'spam': 'spam',
    'low-quality': 'lowQuality',
    'other': 'other'
};

const AdminReports: React.FC<AdminReportsProps> = ({ reports, prompts, onGoToPrompt, onDelete, onRefresh }) => {
    const { t } = useLanguage();
    const [reportSearchQuery, setReportSearchQuery] = useState('');
    const [reportStatusFilter, setReportStatusFilter] = useState<'pending' | 'resolved' | 'all'>('pending');
    
    const filteredReports = useMemo(() => {
        let tempReports = reports;
        if (reportStatusFilter !== 'all') {
            tempReports = tempReports.filter(r => r.status === reportStatusFilter);
        }
        if (reportSearchQuery.trim() !== '') {
            const lowercasedQuery = reportSearchQuery.trim().toLowerCase();
            tempReports = tempReports.filter(r =>
                r.promptText.toLowerCase().includes(lowercasedQuery) || r.details.toLowerCase().includes(lowercasedQuery) ||
                (r.username && r.username.toLowerCase().includes(lowercasedQuery))
            );
        }
        return tempReports;
    }, [reports, reportStatusFilter, reportSearchQuery]);

    const handleUpdateReportStatus = async (report: Report, status: 'resolved' | 'pending') => {
        try {
            await updateReport({ ...report, status });
            onRefresh();
        } catch (error) {
            console.error("Failed to update report:", error);
        }
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
                <h2 className="text-2xl font-bold">{t('admin.reports.title')}<span className="text-base font-medium text-gray-500 dark:text-gray-400 ml-2">{t('admin.reports.total', { filteredCount: filteredReports.length, totalCount: reports.length })}</span></h2>
                <div className="flex items-center gap-4">
                    <input type="text" placeholder={t('admin.reports.searchPlaceholder')} value={reportSearchQuery} onChange={e => setReportSearchQuery(e.target.value)} className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"/>
                    <select id="report-filter" value={reportStatusFilter} onChange={e => setReportStatusFilter(e.target.value as any)} className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600">
                        <option value="pending">{t('common.pending')}</option><option value="resolved">{t('common.resolved')}</option><option value="all">{t('common.all')}</option>
                    </select>
                </div>
            </div>
            <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                        <tr>
                            <th className="p-3">{t('admin.reports.promptHeader')}</th><th className="p-3">{t('admin.reports.reasonHeader')}</th><th className="p-3">{t('admin.reports.detailsHeader')}</th><th className="p-3">{t('admin.reports.reporterHeader')}</th><th className="p-3">{t('common.status')}</th><th className="p-3">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReports.length > 0 ? filteredReports.map(report => {
                            // Use String conversion for safe comparison between string/number IDs
                            const promptExists = prompts.some(p => String(p.id) === String(report.promptId));
                            return (
                            <tr key={report.id} className="border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 max-w-sm truncate" title={report.promptText}>{report.promptText}</td>
                                <td className="p-3 capitalize">{t(`modals.reasons.${reasonKeyMap[report.reason] || 'other'}` as any, { defaultValue: report.reason })}</td>
                                <td className="p-3 max-w-xs truncate" title={report.details}>{report.details || t('common.na')}</td>
                                <td className="p-3">{report.username || t('admin.reports.anonymous')}</td>
                                <td className="p-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${report.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'}`}>{t(`common.${report.status}`)}</span></td>
                                <td className="p-3">
                                    <div className="flex space-x-2">
                                        {report.status === 'pending' && <button onClick={() => handleUpdateReportStatus(report, 'resolved')} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300">{t('common.resolved')}</button>}
                                        <button onClick={() => onGoToPrompt(String(report.promptId))} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!promptExists} title={!promptExists ? t('admin.reports.promptDeleted') : t('admin.reports.viewPrompt')}>{t('admin.reports.viewPrompt')}</button>
                                        <button onClick={() => onDelete(report.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">{t('admin.reports.dismiss')}</button>
                                    </div>
                                </td>
                            </tr>
                        )}) : (<tr><td colSpan={6} className="text-center p-4 text-gray-500 dark:text-gray-400">{t('admin.reports.noReports')}</td></tr>)}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminReports;