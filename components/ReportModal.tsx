
import React, { useState } from 'react';
import { Prompt } from '../utils/types';
import { useAuth } from '../context/AuthContext';
import { addReport } from '../services/api';
import Spinner from './Spinner';
import { useLanguage } from '../context/LanguageContext';

interface ReportModalProps {
  prompt: Prompt;
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ prompt, onClose }) => {
  const [reason, setReason] = useState<'inappropriate' | 'spam' | 'low-quality' | 'other'>('inappropriate');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { currentUser, userProfile } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await addReport({
        promptId: prompt.id,
        promptText: prompt.text,
        reason,
        details,
        userId: currentUser?.uid,
        username: userProfile?.username,
      });
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reasons = [
    { id: 'inappropriate', label: t('modals.reasons.inappropriate') },
    { id: 'spam', label: t('modals.reasons.spam') },
    { id: 'low-quality', label: t('modals.reasons.lowQuality') },
    { id: 'other', label: t('modals.reasons.other') },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white" disabled={isSubmitting}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {success ? (
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-4">{t('modals.reportSuccessTitle')}</h2>
            <p className="text-gray-700 dark:text-gray-300">{t('modals.reportSuccessMessage')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('modals.reportTitle')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('modals.reportMessage')}
            </p>
            
            {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
            
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('modals.reportReason')}</legend>
              {reasons.map(r => (
                <div key={r.id} className="flex items-center">
                  <input
                    id={r.id}
                    name="reason"
                    type="radio"
                    checked={reason === (r.id as any)}
                    onChange={() => setReason(r.id as any)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <label htmlFor={r.id} className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {r.label}
                  </label>
                </div>
              ))}
            </fieldset>

            <div>
              <label htmlFor="report-details" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modals.reportDetails')} ({t('common.optional')})</label>
              <textarea
                id="report-details"
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={t('modals.reportDetailsPlaceholder')}
              />
            </div>
            
            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed w-40 flex justify-center"
              >
                {isSubmitting ? <Spinner size="sm" /> : t('modals.submitReport')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
