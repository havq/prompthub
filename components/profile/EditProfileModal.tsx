
import React, { useState, useEffect, useRef, ChangeEvent, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { uploadImage } from '../../services/imageUploadService';
import { SocialLink, SocialPlatform, UserProfile } from '../../types';
import Spinner from '../Spinner';
import CircularProgress from '../CircularProgress';

interface EditProfileModalProps {
    onClose: () => void;
    onCameraOpen: () => void;
}

const socialPlatformOptions: SocialPlatform[] = ['facebook', 'twitter', 'instagram', 'youtube', 'github', 'linkedin', 'runninghub', 'other'];
const INPUT_STYLE = "block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500";


const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose, onCameraOpen }) => {
    const { userProfile, updateUserProfile, currentUser, isPro, isAdmin } = useAuth();
    const { t } = useLanguage();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [bio, setBio] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [profileBannerUrl, setProfileBannerUrl] = useState('');
    const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState<'photo' | 'banner' | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const [needsPassword, setNeedsPassword] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bannerFileInputRef = useRef<HTMLInputElement>(null);
    const socialIconFileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingIconIndex, setUploadingIconIndex] = useState<number | null>(null);
    const progressIntervalRef = useRef<number | null>(null);

    const hasPasswordAuth = useMemo(() => {
        return currentUser?.providerData.some(provider => provider.providerId === 'password');
    }, [currentUser]);

    useEffect(() => {
        if (!userProfile) return;
        setUsername(userProfile.username || '');
        setEmail(userProfile.email || '');
        setBio(userProfile.bio || '');
        setPhotoURL(userProfile.photoURL || '');
        setProfileBannerUrl(userProfile.profileBannerUrl || '');
        setSocialLinks(userProfile.socialLinks || []);
    }, [userProfile]);

    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, []);

    const startProgressSimulation = () => {
        setUploadProgress(0);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = window.setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) return prev;
                return prev + Math.random() * 10;
            });
        }, 300);
    };

    const completeProgress = () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setUploadProgress(100);
    };

    const resetProgress = () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setUploadProgress(0);
    }

    const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newEmail = e.target.value;
        setEmail(newEmail);
        if (hasPasswordAuth) {
            setNeedsPassword(newEmail.trim().toLowerCase() !== userProfile?.email.toLowerCase());
            if (newEmail.trim().toLowerCase() === userProfile?.email.toLowerCase()) {
                setPassword('');
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        setVerificationSent(false);

        try {
            if (!userProfile || !currentUser) throw new Error("Not authenticated.");
            
            const newEmail = email.trim();
            const emailChanged = hasPasswordAuth && newEmail.toLowerCase() !== userProfile.email.toLowerCase();

            // Step 1: Handle email change first if it exists
            if (emailChanged) {
                 if (!password) throw new Error(t('profile.error.passwordRequired'));
                 // Since we've moved away from Firebase Client SDK for Auth, we cannot call reauthenticateWithCredential directly.
                 // Email updates should be handled by the backend API.
                 // For now, we will prevent email updates or require backend implementation.
                 throw new Error("Changing email address is not supported in this version. Please contact support.");
            }

            // Step 2: Update other profile data if they have changed
            const profileDataToUpdate: Partial<Omit<UserProfile, 'uid' | 'email'>> = {};
            if (username !== userProfile.username) profileDataToUpdate.username = username;
            if (bio !== userProfile.bio) profileDataToUpdate.bio = bio;
            if (photoURL !== userProfile.photoURL) profileDataToUpdate.photoURL = photoURL;
            if (profileBannerUrl !== userProfile.profileBannerUrl) profileDataToUpdate.profileBannerUrl = profileBannerUrl;
            if (JSON.stringify(socialLinks) !== JSON.stringify(userProfile.socialLinks || [])) profileDataToUpdate.socialLinks = socialLinks;

            if (Object.keys(profileDataToUpdate).length > 0) {
                await updateUserProfile(profileDataToUpdate);
            }

            // Step 3: Close modal
            onClose();

        } catch (err: any) {
            setError(err.code === 'auth/wrong-password' ? t('profile.error.wrongPassword') : err.message || t('profile.error.generic'));
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>, type: 'photo' | 'banner') => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(type);
        startProgressSimulation();
        setError('');
        try {
            const result = await uploadImage(file, undefined, { isPro, isAdmin });
            if(type === 'photo') setPhotoURL(result.imageUrl);
            if(type === 'banner') setProfileBannerUrl(result.imageUrl);
            completeProgress();
        } catch(err: any) { setError(err.message || "Failed to upload image."); resetProgress(); } 
        finally {
            setIsUploading(null);
            if (type === 'photo' && fileInputRef.current) fileInputRef.current.value = "";
            if (type === 'banner' && bannerFileInputRef.current) bannerFileInputRef.current.value = "";
            setTimeout(resetProgress, 500);
        }
    };

    // Social Links Handlers
    const handleAddSocialLink = () => setSocialLinks(prev => [...prev, { platform: 'other', url: '', target: '_blank' }]);
    const handleSocialLinkChange = (index: number, field: keyof SocialLink, value: string) => {
        const newLinks = [...socialLinks];
        (newLinks[index] as any)[field] = value;
        setSocialLinks(newLinks);
    };
    const handleRemoveSocialLink = (index: number) => setSocialLinks(prev => prev.filter((_, i) => i !== index));
    const handleIconUploadClick = (index: number) => { setUploadingIconIndex(index); socialIconFileInputRef.current?.click(); };
    const handleSocialIconFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (uploadingIconIndex === null || !e.target.files?.[0]) return;
        setIsUploading('photo'); // Reuse 'photo' state or add new
        startProgressSimulation();
        try {
            const result = await uploadImage(e.target.files[0], undefined, { isPro, isAdmin });
            handleSocialLinkChange(uploadingIconIndex, 'iconUrl', result.imageUrl);
            completeProgress();
        } catch(err: any) { setError(err.message || "Failed to upload icon."); resetProgress(); }
        finally {
            setIsUploading(null);
            setUploadingIconIndex(null);
            if (socialIconFileInputRef.current) socialIconFileInputRef.current.value = "";
            setTimeout(resetProgress, 500);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white" disabled={isSubmitting}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                <form onSubmit={handleSave} className="space-y-6">
                     <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('profile.editButton')}</h2>
                     {error && <p className="text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm text-center">{error}</p>}
                     {verificationSent && (
                        <p className="text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 p-3 rounded-md text-sm text-center">
                            {t('profile.emailVerificationSent', { email: email })}
                        </p>
                    )}
                     
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.changePicture')}</label>
                        <div className="mt-2 flex items-center gap-4">
                            <img src={photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(username || 'User')}`} alt="Avatar Preview" className="h-20 w-20 rounded-full object-cover bg-gray-200 dark:bg-gray-600"/>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!!isUploading} className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium min-w-[100px] flex justify-center items-center">
                                    {isUploading === 'photo' ? <CircularProgress progress={uploadProgress} size={20} strokeWidth={3} /> : 'Upload File'}
                                </button>
                                <button type="button" onClick={() => { onClose(); onCameraOpen(); }} className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium">Take Photo</button>
                                <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, 'photo')} className="hidden" accept="image/*"/>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profile Banner</label>
                        <div className="mt-2 aspect-[3/1] w-full bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center overflow-hidden">
                            {profileBannerUrl ? ( <img src={profileBannerUrl} alt="Banner preview" className="w-full h-full object-cover"/> ) : (<span className="text-sm text-gray-500">No banner</span>)}
                        </div>
                        <button type="button" onClick={() => bannerFileInputRef.current?.click()} disabled={!!isUploading} className="mt-2 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium min-w-[120px] flex justify-center items-center">
                             {isUploading === 'banner' ? <CircularProgress progress={uploadProgress} size={20} strokeWidth={3} /> : 'Upload Banner'}
                        </button>
                        <input type="file" ref={bannerFileInputRef} onChange={(e) => handleFileChange(e, 'banner')} className="hidden" accept="image/*"/>
                    </div>

                    <div><label htmlFor="username" className="block text-sm font-medium">{t('profile.usernameLabel')}</label><input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required className={`mt-1 ${INPUT_STYLE}`}/></div>
                    <div><label htmlFor="bio" className="block text-sm font-medium">{t('profile.bioLabel')}</label><textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t('profile.bioPlaceholder')} className={`mt-1 ${INPUT_STYLE}`}/></div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium">{t('profile.emailLabel')}</label>
                        <input type="email" id="email" value={email} onChange={handleEmailChange} required className={`mt-1 ${INPUT_STYLE}`} disabled={!hasPasswordAuth}/>
                        {!hasPasswordAuth && (
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {t('profile.error.socialEmailChange')}
                            </p>
                        )}
                    </div>

                    {needsPassword && (
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium">{t('profile.reauthPasswordLabel')}</label>
                            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={`mt-1 ${INPUT_STYLE}`}/>
                            <p className="mt-1 text-xs text-gray-500">{t('profile.reauthPasswordHint')}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium">{t('profile.socialLinksLabel')}</label>
                        <div className="mt-2 space-y-3">
                            {socialLinks.map((link, index) => (
                                <div key={index} className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                                    <div className="flex flex-col sm:flex-row items-center gap-2">
                                        <select value={link.platform} onChange={e => handleSocialLinkChange(index, 'platform', e.target.value)} className={`w-full sm:w-48 bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm ${INPUT_STYLE}`}>
                                            <option disabled>Select platform</option>
                                            {socialPlatformOptions.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                                        </select>
                                        <input type="url" placeholder={t('profile.socialUrlPlaceholder')} value={link.url} onChange={e => handleSocialLinkChange(index, 'url', e.target.value)} className={`flex-grow bg-white dark:bg-gray-600 rounded-md px-3 py-2 text-sm ${INPUT_STYLE}`}/>
                                        <button type="button" onClick={() => handleRemoveSocialLink(index)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={handleAddSocialLink} className="w-full text-center py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">{t('profile.addSocialLink')}</button>
                        </div>
                    </div>
                    <input type="file" ref={socialIconFileInputRef} onChange={handleSocialIconFileChange} className="hidden" accept="image/*"/>

                     <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium">{t('profile.cancelButton')}</button>
                        <button type="submit" disabled={isSubmitting || !!isUploading} className="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 w-36 flex justify-center">{isSubmitting ? <Spinner size="sm"/> : t('profile.saveButton')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;