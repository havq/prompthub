
import { fetchApi } from './core';

// --- Payment ---
export const createSepayPayment = (data: { amount: number, content: string }): Promise<{ paymentUrl: string }> => fetchApi<{ paymentUrl: string }>('sepay', '&action=create_payment', { 
    method: 'POST', 
    body: JSON.stringify(data) 
});

export const verifySepayPayment = (data: { trans_id: string; order_code: string; status: string; checksum: string }): Promise<{ success: boolean }> => fetchApi<{ success: boolean }>('sepay', '&action=verify_payment', {
    method: 'POST',
    body: JSON.stringify(data)
});

export const createPaypalOrder = (data: { amount: number, currency: string }): Promise<{ orderID: string }> => fetchApi<{ orderID: string }>('paypal', '&action=create-order', {
    method: 'POST',
    body: JSON.stringify(data)
});

export const capturePaypalOrder = (orderID: string): Promise<{ success: boolean }> => fetchApi<{ success: boolean }>('paypal', '&action=capture-order', {
    method: 'POST',
    body: JSON.stringify({ orderID })
});
