
import React from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

interface LoginSuggestionModalProps {
  onClose: () => void;
}

const LoginSuggestionModal: React.FC<LoginSuggestionModalProps> = ({ onClose }) => {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md relative text-center">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('modals.loginSuggestionTitle')}</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {t('modals.loginSuggestionMessage')}
        </p>
        <div className="flex justify-center space-x-4">
          <Link to="/login" onClick={onClose} className="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
            {t('header.login')}
          </Link>
          <Link to="/register" onClick={onClose} className="py-2 px-6 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
            {t('header.register')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginSuggestionModal;