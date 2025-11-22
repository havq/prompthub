
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { createSepayPayment, createPaypalOrder, capturePaypalOrder } from '../services/api';
import Spinner from '../components/Spinner';
import { getSettings } from '../services/settingsService';

declare global {
    interface Window {
        paypal: any;
    }
}

interface SelectedPlan {
    id: string;
    name: string;
    priceVND: number;
    priceUSD: number;
    description: string;
    days: number; // 0 for lifetime
}

const CheckoutPage: React.FC = () => {
    const { t, language } = useLanguage();
    const { isPro, userProfile, refetchUserProfile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [selectedMethod, setSelectedMethod] = useState<'sepay' | 'paypal' | null>(null);
    const paypalRef = useRef<HTMLDivElement>(null);
    const isCustomErrorSet = useRef(false);

    const { sepayConfig, paypalConfig, proPriceVND, proPriceUSD } = getSettings();

    // Get plan from navigation state, or default to Lifetime from settings
    const planInfo: SelectedPlan = useMemo(() => {
        if (location.state?.selectedPlan) {
            return location.state.selectedPlan;
        }
        // Fallback defaults
        return {
            id: 'lifetime',
            name: 'Lifetime Pro',
            priceVND: proPriceVND || 99000,
            priceUSD: proPriceUSD || 4.99,
            description: 'One-time payment for lifetime access.',
            days: 0
        };
    }, [location.state, proPriceVND, proPriceUSD]);

    const displayPrice = language === 'vi'
      ? `${planInfo.priceVND.toLocaleString('vi-VN')} VNĐ`
      : `$${planInfo.priceUSD.toFixed(2)}`;

    useEffect(() => {
        setError('');
        isCustomErrorSet.current = false;
    }, [selectedMethod]);

    useEffect(() => {
        // Don't auto-redirect if they might be buying an extension or a different pack
        // But for now, if they are Pro and it's a lifetime purchase, maybe warn?
        // For simplicity, we keep the logic open but maybe show a notice.
        /* 
        if (isPro) {
            // Optional: navigate('/profile'); 
        } 
        */
    }, [isPro, navigate]);

    useEffect(() => {
        if (selectedMethod !== 'paypal' || !paypalConfig?.enabled || !userProfile) {
            if (paypalRef.current) {
                paypalRef.current.innerHTML = '';
            }
            return;
        }
        
        if (!paypalConfig.clientId) {
            setError(t('checkout.errorPaypalConfig'));
            return;
        }

        const scriptId = 'paypal-sdk-script';
        
        const renderPaypalButton = () => {
            if (paypalRef.current && window.paypal) {
                paypalRef.current.innerHTML = '';
                window.paypal.Buttons({
                    style: {
                        layout: 'vertical',
                        color: 'blue',
                        shape: 'rect',
                        label: 'paypal'
                    },
                    createOrder: async () => {
                        setError('');
                        isCustomErrorSet.current = false;
                        setIsLoading('paypal');
                        try {
                            const response = await createPaypalOrder({ amount: planInfo.priceUSD, currency: 'USD' });
                            setIsLoading(null); 
                            return response.orderID;
                        } catch (err: any) {
                            const baseMessage = t('checkout.errorPaypalCreateOrder');
                            const details = err.message ? `: ${err.message}` : '.';
                            setError(`${baseMessage}${details}`);
                            isCustomErrorSet.current = true;
                            setIsLoading(null);
                            return Promise.reject(err);
                        }
                    },
                    onApprove: async (data: any) => {
                        setIsLoading('paypal');
                        try {
                            const response = await capturePaypalOrder(data.orderID);
                            if (response.success) {
                                await refetchUserProfile();
                                navigate('/payment-status?status=success&method=paypal');
                            } else {
                                throw new Error('Payment capture failed on the server.');
                            }
                        } catch (err: any) {
                            const baseMessage = t('checkout.errorPaypalCaptureOrder');
                            const details = err.message ? `: ${err.message}` : '.';
                            setError(`${baseMessage}${details}`);
                            isCustomErrorSet.current = true;
                            setIsLoading(null);
                        }
                    },
                    onError: (err: any) => {
                        if (!isCustomErrorSet.current) {
                            setError(t('checkout.errorPaypalGeneric'));
                        }
                        console.error('PayPal onError:', err);
                        setIsLoading(null);
                    },
                    onCancel: () => {
                        setIsLoading(null);
                    }
                }).render(paypalRef.current).catch((err: any) => {
                    console.error("PayPal button render error:", err);
                    setError(t('checkout.errorPaypalLoad'));
                });
            } else if (paypalRef.current) {
                 setError(t('checkout.errorPaypalLoad'));
            }
        };

        if (!document.getElementById(scriptId)) {
            let script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://www.paypal.com/sdk/js?client-id=${paypalConfig.clientId}&currency=USD`;
            script.async = true;
            script.onload = renderPaypalButton;
            script.onerror = () => {
                setError(t('checkout.errorPaypalScript'));
            };
            document.body.appendChild(script);
        } else {
            renderPaypalButton();
        }

    }, [selectedMethod, paypalConfig, userProfile, refetchUserProfile, navigate, planInfo.priceUSD, t]);

    const handleSepayPayment = async () => {
        if (!userProfile) {
            navigate('/login');
            return;
        }
        setIsLoading('sepay');
        setError('');
        try {
            const paymentDetails = { amount: planInfo.priceVND, content: `Upgrade ${planInfo.name}: ${userProfile.username}` };
            const response = await createSepayPayment(paymentDetails);
            if (response.paymentUrl) {
                window.location.href = response.paymentUrl;
            } else {
                throw new Error('Could not retrieve payment URL.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setIsLoading(null);
        }
    };
    
    const renderPaymentAction = () => {
        if (!selectedMethod) return null;

        if (selectedMethod === 'sepay') {
            return (
                <button 
                    onClick={handleSepayPayment} 
                    disabled={isLoading === 'sepay'}
                    className="w-full mt-6 py-3 px-6 rounded-lg shadow-lg text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center"
                >
                    {isLoading === 'sepay' ? <Spinner /> : t('checkout.payWithSepay')}
                </button>
            );
        }

        if (selectedMethod === 'paypal') {
            return (
                <div className="relative mt-6">
                    {isLoading === 'paypal' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 rounded-md z-10">
                            <Spinner />
                        </div>
                    )}
                    <div ref={paypalRef} className={isLoading === 'paypal' ? 'opacity-50' : ''}></div>
                </div>
            );
        }
    };

    return (
        <div className="max-w-lg mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">{t('checkout.title')}</h1>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">{t('checkout.subtitle')}</p>
                </div>

                <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4">
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-medium text-gray-800 dark:text-gray-200">{planInfo.name}</span>
                        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{displayPrice}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{planInfo.description}</p>
                </div>

                {error && <p className="text-red-500 dark:text-red-400 text-center text-sm">{error}</p>}

                <div className="space-y-4">
                    <h2 className="text-lg font-medium text-center text-gray-700 dark:text-gray-300">{t('checkout.chooseMethod')}</h2>
                    
                    <div className="space-y-3">
                        {sepayConfig?.enabled && (
                             <label className={`flex items-center p-4 rounded-lg border-2 transition-colors cursor-pointer ${selectedMethod === 'sepay' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}>
                                <input type="radio" name="payment-method" value="sepay" checked={selectedMethod === 'sepay'} onChange={() => setSelectedMethod('sepay')} className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"/>
                                <span className="ml-4 flex flex-col">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">Pay with SePay (VNĐ)</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">ATM, Bank Transfer, QR Code</span>
                                </span>
                             </label>
                        )}
                         {paypalConfig?.enabled && (
                             <label className={`flex items-center p-4 rounded-lg border-2 transition-colors cursor-pointer ${selectedMethod === 'paypal' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}>
                                <input type="radio" name="payment-method" value="paypal" checked={selectedMethod === 'paypal'} onChange={() => setSelectedMethod('paypal')} className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"/>
                                <span className="ml-4 flex flex-col">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">Pay with PayPal (USD)</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Credit/Debit Card or PayPal Balance</span>
                                </span>
                             </label>
                        )}
                    </div>

                    {renderPaymentAction()}

                    {(!sepayConfig?.enabled && !paypalConfig?.enabled) && (
                        <p className="text-center text-gray-500 dark:text-gray-400">No payment methods are currently available. Please contact support.</p>
                    )}
                </div>
                
                <div className="text-center">
                    <button onClick={() => navigate(-1)} className="text-sm text-gray-500 dark:text-gray-400 hover:underline">Back</button>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
