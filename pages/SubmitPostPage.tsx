import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { addPost, getPostCategories, getAllUsers } from '../services/api';
import { Post, PostCategory as Category, UserProfile } from '../utils/types';
import Spinner from '../components/Spinner';
import PostForm from '../components/PostForm';

export const SubmitPostPage: React.FC = () => {
    const { currentUser, userProfile, isAdmin } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [categories, setCategories] = useState<Category[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            getPostCategories(),
            isAdmin ? getAllUsers() : Promise.resolve([])
        ]).then(([categoryData, userData]) => {
            setCategories(categoryData.map(c => ({ id: c.id, name: c.name, parentId: c.parentId })));
            setUsers(userData);
        }).catch(err => {
            console.error("Failed to fetch initial data for post submission:", err);
            setError("Failed to load necessary data. Please try again.");
        }).finally(() => {
            setIsLoading(false);
        });
    }, [isAdmin]);

    if (!currentUser || !userProfile) {
        // This should be caught by ProtectedRoute, but as a fallback
        return (
            <div className="text-center p-8">
                <p>{t('submitPromptPage.errorLoggedIn')}</p>
            </div>
        );
    }

    const handleSubmit = async (postData: Omit<Post, 'id' | 'createdAt'>) => {
        setIsSubmitting(true);
        setError('');
        setSuccess('');

        // If user is not admin, force status to pending. Otherwise, respect form status.
        const finalStatus = isAdmin ? postData.status : 'pending';

        const finalPostData = {
            ...postData,
            authorId: currentUser.uid,
            authorName: userProfile.username,
            status: finalStatus,
        };

        try {
            await addPost(finalPostData as any); // API expects the status
            
            const successMessage = isAdmin ? "Post created successfully! Redirecting..." : "Your post has been submitted for review. Thank you!";
            setSuccess(successMessage);
            
            setTimeout(() => {
                if (isAdmin) {
                    navigate('/admin', { state: { defaultTab: 'posts' } });
                } else {
                    navigate('/posts');
                }
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
        <div className="max-w-6xl mx-auto">
            <div className="mb-6">
                <button 
                    onClick={() => navigate('/admin', { state: { defaultTab: 'posts' } })} 
                    className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>{t('admin.backToAdmin')}</span> 
                </button>
            </div>
             <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t('admin.postForm.addTitle')}</h1>
            </div>
            {error && <p className="my-4 text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm text-center">{error}</p>}
            {success && <p className="my-4 text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 p-3 rounded-md text-sm text-center">{success}</p>}

            <PostForm
                initialData={null}
                categories={categories}
                users={users}
                onSubmit={handleSubmit}
                onClose={() => navigate(-1)}
                isSubmitting={isSubmitting}
                currentUserProfile={userProfile}
            />
        </div>
    );
};

export default SubmitPostPage;