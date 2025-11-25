
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useLanguage } from '../context/LanguageContext';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { getSettings } from '../services/settingsService';
import { verifyRecaptcha } from '../services/api';

declare global {
    interface Window {
        grecaptcha: any;
        recaptchaScriptLoaded: boolean;
    }
}

const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { t, tComponent } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const recaptchaRef = useRef<HTMLDivElement>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const settings = getSettings();
  const recaptchaSettings = settings.recaptchaSettings;
  const registrationEnabled = settings.registrationEnabled ?? true;
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    const scriptId = 'google-gsi-script';
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      const scriptTag = document.getElementById(scriptId);
      if (scriptTag) {
        document.head.removeChild(scriptTag);
      }
    };
  }, []);

  useEffect(() => {
    if (recaptchaSettings?.enabled && !window.recaptchaScriptLoaded) {
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSettings.version === 'v3' ? recaptchaSettings.v3SiteKey : 'explicit'}`;
        script.async = true;
        script.defer = true;
        script.id = 'recaptcha-script';
        document.head.appendChild(script);
        window.recaptchaScriptLoaded = true;
    }
  }, [recaptchaSettings]);

  useEffect(() => {
    if (recaptchaSettings?.enabled && recaptchaSettings.version === 'v2' && recaptchaRef.current) {
        const interval = setInterval(() => {
            if (window.grecaptcha && window.grecaptcha.render) {
                clearInterval(interval);
                window.grecaptcha.render(recaptchaRef.current, {
                    sitekey: recaptchaSettings.v2SiteKey,
                    callback: (token: string) => setRecaptchaToken(token),
                    'expired-callback': () => setRecaptchaToken(''),
                });
            }
        }, 100);
        return () => clearInterval(interval);
    }
  }, [recaptchaSettings]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        if (recaptchaSettings?.enabled) {
            let token = recaptchaToken;
            if (recaptchaSettings.version === 'v3') {
                if (!window.grecaptcha) throw new Error("reCAPTCHA script not loaded.");
                token = await window.grecaptcha.execute(recaptchaSettings.v3SiteKey, { action: 'login' });
            }
            if (!token) {
                 throw new Error("Please complete the reCAPTCHA challenge.");
            }
            
            const verification = await verifyRecaptcha(token, recaptchaSettings.version);
            if (!verification.success) {
                throw new Error(verification.message || "reCAPTCHA verification failed. Please try again.");
            }
        }
        
        await login(identifier, password, rememberMe);
        navigate(from, { replace: true });
    } catch (err: any) {
      let errorMessage = t('login.error.generic');
      if (err.message) {
         errorMessage = err.message; 
      }
      // Handle specific error text from API if needed
      if (errorMessage.includes('Invalid credentials')) {
          errorMessage = t('login.error.invalidCredentials');
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      if (recaptchaSettings?.enabled && recaptchaSettings.version === 'v2' && window.grecaptcha) {
          window.grecaptcha.reset();
          setRecaptchaToken('');
      }
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || t('login.error.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled = isLoading || (recaptchaSettings?.enabled && recaptchaSettings.version === 'v2' && !recaptchaToken);

  return (
    <>
      {isResetModalOpen && <ForgotPasswordModal onClose={() => setIsResetModalOpen(false)} />}
      <div className="max-w-md mx-auto mt-10">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 space-y-6">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">{t('login.title')}</h2>
          
          {error && <p className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm text-center">{error}</p>}

          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('login.emailOrUsernameLabel')}</label>
            <input
              type="text"
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('login.passwordLabel')}</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.477 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" />
                    <path d="M10 17.5c-2.426 0-4.685-1.18-6.157-3.232l1.25-1.25a8.003 8.003 0 0110.014-1.43L16.32 14.4A9.96 9.96 0 0110 17.5z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.523 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                {t('login.rememberMe')}
              </label>
            </div>
            <div className="text-sm">
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setIsResetModalOpen(true); }}
                className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                {t('login.forgotPassword')}
              </a>
            </div>
          </div>
          
          {recaptchaSettings?.enabled && recaptchaSettings.version === 'v2' && (
              <div className="flex justify-center">
                  <div ref={recaptchaRef}></div>
              </div>
          )}
          
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? <Spinner size="sm" /> : t('login.button')}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">{t('common.or')}</span>
            </div>
          </div>

          <div>
              <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-800 dark:text-white bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50"
              >
                  <svg className="w-5 h-5 mr-2" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Google</title><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  {t('login.continueWithGoogle')}
              </button>
          </div>

          {registrationEnabled && (
            <p className="text-sm text-center text-gray-500 dark:text-gray-400">
              {t('login.noAccount')}{' '}
              <Link to="/register" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                {t('login.signup')}
              </Link>
            </p>
          )}

          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              {tComponent('login.agreeToTerms', {
                '0': (text) => <Link to="/page/terms-of-use" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300" target="_blank">{text}</Link>,
                '1': (text) => <Link to="/page/privacy-policy" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300" target="_blank">{text}</Link>,
              })}
          </div>

        </form>
      </div>
    </>
  );
};

export default LoginPage;