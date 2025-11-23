import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { resetPassword } from '../services/api';

const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const uid = searchParams.get('uid');
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Validate link presence
    if (!uid || !token) {
        return (
             <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invalid Link</h2>
                <p className="text-gray-600 dark:text-gray-400">The password reset link is invalid or missing parameters.</p>
                <Link to="/login" className="text-indigo-600 hover:underline">Return to Login</Link>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await resetPassword(uid, token, password);
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message || "Failed to reset password. The link may have expired.");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="max-w-md mx-auto mt-20 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Password Reset Successful</h2>
                <p className="text-gray-600 dark:text-gray-300">Your password has been updated. Redirecting to login...</p>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto mt-16 px-4">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8 space-y-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Enter your new password below.</p>
                </div>
                
                {error && (
                    <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-md text-sm text-center">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                        minLength={6}
                        placeholder="••••••••"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                        minLength={6}
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? <Spinner size="sm" /> : "Set New Password"}
                </button>

                <div className="text-center mt-4">
                     <Link to="/login" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                        Back to Login
                    </Link>
                </div>
            </form>
        </div>
    );
};

export default ResetPasswordPage;