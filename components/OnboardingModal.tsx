
import React, { useState } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

interface OnboardingModalProps {
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const navigate = useNavigate();
  const { t, tComponent } = useLanguage();

  const handleFinish = () => {
    if (dontShowAgain) {
        try {
          localStorage.setItem('hasOnboarded', 'true');
        } catch (e) {
          console.error("Failed to save onboarding status to localStorage.", e);
        }
    }
    onClose();
  };
  
  const handleGoToRegister = () => {
      handleFinish();
      navigate('/register');
  }

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('modals.onboarding.welcomeTitle')}</h2>
            <p className="text-gray-600 dark:text-gray-300">
              {t('modals.onboarding.welcomeMessage')}
            </p>
          </>
        );
      case 2:
        return (
          <>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('modals.onboarding.discoverTitle')}</h2>
            <ul className="space-y-3 text-gray-600 dark:text-gray-300 list-disc list-inside">
              <li>{tComponent('modals.onboarding.discoverLi1')}</li>
              <li>{tComponent('modals.onboarding.discoverLi2')}</li>
              <li>{tComponent('modals.onboarding.discoverLi3')}</li>
            </ul>
          </>
        );
      case 3:
        return (
          <>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('modals.onboarding.communityTitle')}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('modals.onboarding.communityMessage')}
            </p>
            <ul className="space-y-3 text-gray-600 dark:text-gray-300 list-disc list-inside">
              <li>{tComponent('modals.onboarding.communityLi1')}</li>
              <li>{tComponent('modals.onboarding.communityLi2')}</li>
              <li>{tComponent('modals.onboarding.communityLi3')}</li>
            </ul>
          </>
        );
      default:
        return null;
    }
  };

  const totalSteps = 3;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg relative flex flex-col p-8 space-y-6">
        <div>{renderStepContent()}</div>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i + 1 === step ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4">
            <div className="flex items-center">
                <input
                    id="dont-show-again"
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor="dont-show-again" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    {t('modals.onboarding.dontShowAgain')}
                </label>
            </div>
          <div className="flex items-center space-x-2">
            <button
                onClick={handleFinish}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors px-4 py-2"
              >
                {t('common.skip')}
            </button>
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {t('common.back')}
              </button>
            )}
            {step < totalSteps ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {t('common.next')}
              </button>
            ) : (
                <div className="flex space-x-2">
                    <button
                        onClick={handleGoToRegister}
                        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                    >
                        {t('modals.onboarding.createAccount')}
                    </button>
                    <button
                        onClick={handleFinish}
                        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        {t('modals.onboarding.getStarted')}
                    </button>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;