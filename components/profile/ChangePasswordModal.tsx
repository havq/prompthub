
import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import Spinner from '../Spinner';

interface ChangePasswordModalProps {
    onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
    const { changePassword, currentUser } = useAuth();
    const { t } = useLanguage();
    
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordChangeMessage, setPasswordChangeMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Check if the user has a password provider linked
    const hasPasswordAuth = useMemo(() => {
        return currentUser?.providerData.some(provider => provider.providerId === 'password');
    }, [currentUser]);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordChangeMessage(null);
        if (newPassword !== confirmNewPassword) { setPasswordChangeMessage({ type: 'error', text: t('profile.error.passwordMismatch') }); return; }
        if (newPassword.length < 6) { setPasswordChangeMessage({ type: 'error', text: t('profile.error.passwordLength') }); return; }

        setIsChangingPassword(true);
        try {
            // If user doesn't have a password set (e.g. Google login only), pass empty string for old password.
            // The context has been updated to handle this.
            const oldPassToSend = hasPasswordAuth ? oldPassword : '';
            
            const success = await changePassword(oldPassToSend, newPassword);
            if (success) {
                setPasswordChangeMessage({ type: 'success', text: t('profile.passwordSuccess') });
                setOldPassword(''); setNewPassword(''); setConfirmNewPassword('');
                setTimeout(() => { onClose(); setPasswordChangeMessage(null); }, 2000);
            } else { setPasswordChangeMessage({ type: 'error', text: t('profile.error.wrongPassword') }); }
        } catch (err: any) {
            let errorMessage = t('profile.error.changePasswordGeneric');
            if (err.code === 'auth/wrong-password') {
                errorMessage = t('profile.error.wrongPassword');
            } else if (err.code === 'auth/requires-recent-login') {
                errorMessage = "For security, please log out and log in again before setting a new password.";
            }
            setPasswordChangeMessage({ type: 'error', text: errorMessage });
            console.error(err);
        } finally {
            setIsChangingPassword(false);
        }
    };

    const titleKey = hasPasswordAuth ? 'profile.changePasswordTitle' : 'Set Password'; // Use fallback or add new key

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white" disabled={isChangingPassword}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                <form onSubmit={handlePasswordChange} className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {hasPasswordAuth ? t('profile.changePasswordTitle') : "Set Account Password"}
                    </h2>
                    {!hasPasswordAuth && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            You logged in with a social account. Set a password to also log in with email.
                        </p>
                    )}
                    
                    {passwordChangeMessage && <p className={`text-sm ${passwordChangeMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{passwordChangeMessage.text}</p>}
                    
                    {hasPasswordAuth && (
                        <div>
                            <label htmlFor="old-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.currentPasswordLabel')}</label>
                            <input type="password" id="old-password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    )}
                    
                    <div><label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.newPasswordLabel')}</label><input type="password" id="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                    <div><label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.confirmNewPasswordLabel')}</label><input type="password" id="confirm-new-password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                    <div className="flex justify-end"><button type="submit" disabled={isChangingPassword} className="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 w-48 flex justify-center disabled:opacity-50">{isChangingPassword ? <Spinner size="sm"/> : (hasPasswordAuth ? t('profile.updatePasswordButton') : "Set Password")}</button></div>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
