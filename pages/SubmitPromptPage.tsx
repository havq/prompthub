
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { addPrompt, getCategories, getAllUsers } from '../services/api';
import { Prompt, CategoryWithCount, UserProfile } from '../utils/types';
import Spinner from '../components/Spinner';
import { PromptForm } from '../components/PromptForm';

export const SubmitPromptPage: React.FC = () => {
    const { currentUser, userProfile, isAdmin, isPro } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [categories, setCategories] = useState<CategoryWithCount[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            getCategories(),
            isAdmin ? getAllUsers() : Promise.resolve([])
        ]).then(([categoryData, userData]) => {
            setCategories(categoryData);
            setUsers(userData);
        }).catch(err => {
            console.error("Failed to fetch initial data for prompt submission:", err);
            setError("Failed to load necessary data. Please try again.");
        }).finally(() => {
            setIsLoading(false);
        });
    }, [isAdmin]);

    if (!currentUser || !userProfile) {
        return (
            <div className="text-center p-8">
                <p>{t('submitPromptPage.errorLoggedIn')}</p>
            </div>
        );
    }

    const handleSubmit = async (promptData: Omit<Prompt, 'id' | 'createdAt'> | Prompt) => {
        if ('id' in promptData) return; // Should not happen for new submission
        
        setIsSubmitting(true);
        setError('');
        setSuccess('');

        // Force status to pending for non-admins, regardless of what the form says
        // For Admins, trust the form state (which defaults to 'approved')
        const finalStatus = isAdmin ? promptData.status : 'pending';

        // Logic to determine author
        let finalAuthorId = currentUser.uid;
        let finalAuthorName = userProfile.username;
        let finalAuthorPhotoURL = userProfile.photoURL;

        // If admin changed the author in the form
        if (isAdmin && promptData.authorId && promptData.authorId !== currentUser.uid) {
            const selectedUser = users.find(u => u.uid === promptData.authorId);
            if (selectedUser) {
                finalAuthorId = selectedUser.uid;
                finalAuthorName = selectedUser.username;
                finalAuthorPhotoURL = selectedUser.photoURL;
            }
        }

        const finalPromptData = {
            ...promptData,
            authorId: finalAuthorId,
            authorName: finalAuthorName,
            authorPhotoURL: finalAuthorPhotoURL,
            status: finalStatus,
        };

        try {
            await addPrompt(finalPromptData as any);
            
            const successMessage = isAdmin 
                ? "Prompt created successfully!" 
                : "Your prompt has been submitted for review. Thank you!";
            setSuccess(successMessage);
            
            setTimeout(() => {
                // Always redirect to profile page from the public submission form
                // This provides a better UX than sending admins to the backend dashboard
                navigate('/profile');
            }, 2000);

        } catch (err: any) {
            setError(err.message || t('submitPromptPage.errorSubmission'));
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading) {
        return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    }

    return (
        <div className="max-w-6xl py-8 -mx-4 md:mx-auto lg:mx-auto px-0">
            <div className="mb-6 mx-4 md:mx-auto lg:mx-auto">
                <button 
                    onClick={() => navigate('/')} 
                    className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>{t('common.back')}</span> 
                </button>
            </div>
            
             <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('home.submitPrompt')}</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">{t('submitPromptPage.subtitle')}</p>
            </div>

            {error && <p className="my-4 text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm text-center">{error}</p>}
            {success && <p className="my-4 text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 p-3 rounded-md text-sm text-center">{success}</p>}

            <PromptForm
                initialData={null}
                categories={categories}
                users={users}
                onSubmit={handleSubmit}
                onClose={() => navigate(-1)}
                isSubmitting={isSubmitting}
                isUserAdmin={isAdmin}
                isPro={!!isPro}
                inline={true}
            />
        </div>
    );
};
