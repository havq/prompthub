import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getPost, getPostCategories, getAllUsers, updatePost } from '../services/api';
import { Post, PostCategory as Category, UserProfile } from '../utils/types';
import Spinner from '../components/Spinner';
import PostForm from '../components/PostForm';

export const EditPostPage: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const { currentUser, userProfile, isAdmin } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [initialData, setInitialData] = useState<Post | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (!postId) {
            navigate('/posts');
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [postData, categoryData, allUsersData] = await Promise.all([
                    getPost(postId),
                    getPostCategories(),
                    isAdmin ? getAllUsers() : Promise.resolve([])
                ]);

                // Security check: only author or admin can edit
                if (!isAdmin && postData.authorId !== currentUser?.uid) {
                    setError("You don't have permission to edit this post.");
                    setTimeout(() => navigate('/posts'), 3000);
                    return;
                }

                setInitialData(postData);
                setCategories(categoryData.map(c => ({ id: c.id, name: c.name, parentId: c.parentId })));
                setUsers(allUsersData);

            } catch (err) {
                console.error("Failed to fetch data for post editing:", err);
                setError("Failed to load post data. It may have been deleted.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [postId, isAdmin, currentUser, navigate]);

    const handleSubmit = async (postData: Post | Omit<Post, 'id' | 'createdAt'>) => {
        if (!('id' in postData)) return; // Should not happen in edit mode

        setIsSubmitting(true);
        setError('');
        setSuccess('');

        try {
            await updatePost(postData);
            setSuccess("Post updated successfully! Redirecting...");
            setTimeout(() => {
                if (isAdmin) {
                    navigate('/admin', { state: { defaultTab: 'posts' } });
                } else {
                    navigate('/posts');
                }
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'An error occurred during submission.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    }

    if (error && !initialData) {
        return <div className="text-center p-8 text-red-500">{error}</div>;
    }

    if (!initialData) {
        return <div className="text-center p-8">Post not found.</div>;
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
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t('admin.postForm.editTitle')}</h1>
            </div>
            {error && <p className="my-4 text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm text-center">{error}</p>}
            {success && <p className="my-4 text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 p-3 rounded-md text-sm text-center">{success}</p>}

            <PostForm
                initialData={initialData}
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

export default EditPostPage;