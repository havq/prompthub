
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Badge, SocialLink } from '../types';
import Spinner from './Spinner';
import { uploadImage } from '../services/imageUploadService';
import { useLanguage } from '../context/LanguageContext';
import BadgeIcon from './BadgeIcon';
import { getSettings } from '../services/settingsService';

interface UserFormProps {
  initialData: UserProfile | null;
  onSubmit: (data: UserProfile | Omit<UserProfile, 'uid'>) => void;
  onClose: () => void;
  isSubmitting: boolean;
  error?: string;
  clearError?: () => void;
}

const INPUT_STYLE = "block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500";

const allBadges: Badge[] = [
  'first-contribution', 'prolific-creator', 'master-creator',
  'remix-artist', 'remix-master', 'top-rated', 'community-favorite', 'curator'
];

const validateImageFile = (file: File, t: (key: string, options?: any) => string): { isValid: boolean; error?: string } => {
    const MAX_SIZE_MB = getSettings().imageUploadMaxSizeMb || 10;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!ALLOWED_TYPES.includes(file.type)) {
        return {
            isValid: false,
            error: t('modals.showcase.errorInvalidFileType')
        };
    }

    if (file.size > MAX_SIZE_BYTES) {
        return {
            isValid: false,
            error: t('modals.showcase.errorFileSize', { size: MAX_SIZE_MB })
        };
    }

    return { isValid: true };
};

const UserForm: React.FC<UserFormProps> = ({ initialData, onSubmit, onClose, isSubmitting, error, clearError }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'User' | 'Admin'>('User');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [profileBannerUrl, setProfileBannerUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isPro, setIsPro] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (initialData) {
      setUsername(initialData.username || '');
      setEmail(initialData.email || '');
      setRole(initialData.role || 'User');
      setBio(initialData.bio || '');
      setPhotoURL(initialData.photoURL || '');
      setProfileBannerUrl(initialData.profileBannerUrl || '');
      setSocialLinks(initialData.socialLinks || []);
      setBadges(initialData.badges || []);
      setIsPro(initialData.isPro || false);
      setPassword('');
    } else {
      // Reset for new user form
      setUsername('');
      setEmail('');
      setRole('User');
      setBio('');
      setPhotoURL('');
      setProfileBannerUrl('');
      setSocialLinks([]);
      setBadges([]);
      setIsPro(false);
      setPassword('');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isUploading) return;
    
    if (initialData) {
      const updatedUser: UserProfile = {
        ...initialData,
        username,
        email, // Email is not editable in this form
        role,
        bio,
        photoURL,
        profileBannerUrl,
        socialLinks,
        badges,
        isPro,
      };
      onSubmit(updatedUser);
    } else {
      const newUser: Omit<UserProfile, 'uid'> = { 
        username, 
        email, 
        role, 
        bio, 
        photoURL,
        profileBannerUrl,
        socialLinks,
        badges,
        isPro,
        // Password is not part of the UserProfile type, it's handled separately by auth
      };
      // A little hacky, but we pass the password along this way for the mock API
      (newUser as any).password = password;
      onSubmit(newUser);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file, t);
    if (!validation.isValid) {
        alert(validation.error || 'Invalid file.');
        if (e.target) e.target.value = "";
        return;
    }

    setIsUploading(true);
    try {
        const result = await uploadImage(file, undefined, { isAdmin: true });
        setPhotoURL(result.imageUrl);
    } catch(err: any) {
        alert(err.message || "Failed to upload image.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleBadgeChange = (badge: Badge) => {
    setBadges(prev => 
      prev.includes(badge)
        ? prev.filter(b => b !== badge)
        : [...prev, badge]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-4xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{initialData ? t('admin.userForm.editTitle') : t('admin.userForm.addTitle')}</h2>
            
            {error && (
                <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-center">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="user-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.userForm.usernameLabel')}</label>
                    <input id="user-username" type="text" value={username} onChange={(e) => { setUsername(e.target.value); clearError?.(); }} required className={`mt-1 ${INPUT_STYLE}`} />
                </div>
                <div>
                    <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.userForm.emailLabel')}</label>
                    <input id="user-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearError?.(); }} required disabled={!!initialData} className={`mt-1 disabled:cursor-not-allowed disabled:bg-gray-200 dark:disabled:bg-gray-700/50 ${INPUT_STYLE}`} />
                </div>
                {!initialData && (
                    <div>
                        <label htmlFor="user-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.userForm.passwordLabel')}</label>
                        <input id="user-password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); clearError?.(); }} required minLength={6} className={`mt-1 ${INPUT_STYLE}`} />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('admin.userForm.passwordHint')}</p>
                    </div>
                )}
                 <div>
                    <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.userForm.roleLabel')}</label>
                    <select id="user-role" value={role} onChange={(e) => setRole(e.target.value as 'User' | 'Admin')} className={`mt-1 ${INPUT_STYLE}`}>
                        <option value="User">{t('admin.userForm.roleUser')}</option>
                        <option value="Admin">{t('admin.userForm.roleAdmin')}</option>
                    </select>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="flex-grow flex flex-col">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('admin.userForm.proLabel')}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('admin.userForm.proHint')}</span>
                    </span>
                    <label htmlFor="is-pro-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="is-pro-toggle" className="sr-only peer" checked={isPro} onChange={e => setIsPro(e.target.checked)} />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
                 <div>
                    <label htmlFor="user-bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.userForm.bioLabel')}</label>
                    <textarea id="user-bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className={`mt-1 ${INPUT_STYLE}`} />
                </div>
                <div>
                    <label htmlFor="user-photo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.userForm.photoUrlLabel')}</label>
                    <div className="mt-1 flex items-center gap-4">
                        <img 
                            src={photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(username || 'User')}`} 
                            alt="Avatar Preview" 
                            className="h-16 w-16 rounded-full object-cover bg-gray-200 dark:bg-gray-600 flex-shrink-0"
                        />
                        <div className="flex-grow">
                            <div className="flex rounded-md shadow-sm">
                                <input type="text" id="user-photo" value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} placeholder={t('admin.userForm.photoUrlPlaceholder')} className={`flex-1 block w-full rounded-none rounded-l-md ${INPUT_STYLE}`}/>
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="relative -ml-px inline-flex items-center justify-center w-28 space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-r-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50">
                                    {isUploading ? <Spinner size="sm" /> : <span>{t('admin.settings.upload')}</span>}
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*"/>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.userForm.manageBadges')}</label>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-gray-100 dark:bg-gray-700">
                    {allBadges.map(badge => (
                      <div key={badge} className="flex items-center gap-2">
                        <input
                          id={`badge-${badge}`}
                          type="checkbox"
                          checked={badges.includes(badge)}
                          onChange={() => handleBadgeChange(badge)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-400 dark:border-gray-500 bg-gray-200 dark:bg-gray-600 rounded"
                        />
                        <label htmlFor={`badge-${badge}`} className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                          <BadgeIcon badge={badge} size="sm" />
                          <span>{t(`badges.${badge}.title` as any)}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                    <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">{t('common.cancel')}</button>
                    <button type="submit" disabled={isSubmitting || isUploading} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 w-36 flex justify-center">
                        {isSubmitting ? <Spinner size="sm" /> : (initialData ? t('admin.userForm.saveChanges') : t('admin.userForm.createUser'))}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default UserForm;
