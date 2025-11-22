
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { verifySepayPayment } from '../services/api';
import Spinner from '../components/Spinner';
import { useLanguage } from '../context/LanguageContext';

const PaymentStatusPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refetchUserProfile } = useAuth();
    const { t } = useLanguage();

    const [status, setStatus] = useState<'verifying' | 'success' | 'failed' | 'invalid'>('verifying');
    const [message, setMessage] = useState('Verifying your payment, please wait...');

    useEffect(() => {
        const trans_id = searchParams.get('trans_id');
        const order_code = searchParams.get('order_code');
        const payment_status = searchParams.get('status');
        const checksum = searchParams.get('checksum');
        const method = searchParams.get('method');

        // Handle direct success from PayPal
        if (method === 'paypal' && payment_status === 'success') {
             setStatus('success');
             setMessage('Payment successful! Your account has been upgraded to Pro.');
             refetchUserProfile();
             setTimeout(() => navigate('/profile'), 3000);
             return;
        }

        if (!trans_id || !order_code || !payment_status || !checksum) {
            setStatus('invalid');
            setMessage('Invalid payment response. Missing required parameters.');
            return;
        }

        const verifyPayment = async () => {
            try {
                const response = await verifySepayPayment({
                    trans_id,
                    order_code,
                    status: payment_status,
                    checksum,
                });

                if (response.success) {
                    setStatus('success');
                    setMessage('Payment successful! Your account has been upgraded to Pro.');
                    await refetchUserProfile(); // Refresh user state to reflect Pro status
                    setTimeout(() => navigate('/profile'), 3000);
                } else {
                    setStatus('failed');
                    setMessage('Payment verification failed. Please contact support if you have been charged.');
                }
            } catch (error) {
                console.error("Payment verification error:", error);
                setStatus('failed');
                setMessage(error instanceof Error ? error.message : 'An unexpected error occurred during verification.');
            }
        };

        verifyPayment();
    }, [searchParams, refetchUserProfile, navigate]);

    const renderIcon = () => {
        switch (status) {
            case 'verifying':
                return <Spinner size="lg" />;
            case 'success':
                return (
                    <svg className="w-16 h-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'failed':
            case 'invalid':
                return (
                    <svg className="w-16 h-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center max-w-lg w-full">
                <div className="flex justify-center mb-6">
                    {renderIcon()}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {status === 'verifying' && 'Payment Verification'}
                    {status === 'success' && 'Upgrade Successful!'}
                    {status === 'failed' && 'Payment Failed'}
                    {status === 'invalid' && 'Invalid Request'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {message}
                </p>
                {status === 'success' && (
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                        You will be redirected to your profile shortly...
                    </p>
                )}
                {(status === 'failed' || status === 'invalid') && (
                     <Link to="/" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Go to Homepage
                    </Link>
                )}
            </div>
        </div>
    );
};

export default PaymentStatusPage;
