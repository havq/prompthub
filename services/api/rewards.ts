
import { fetchApi } from './core';

export const redeemPro = (packageId: string): Promise<{ success: boolean; newPoints: number; newExpiration: string; isPro: boolean }> => {
    return fetchApi<{ success: boolean; newPoints: number; newExpiration: string; isPro: boolean }>('rewards', '', {
        method: 'POST',
        body: JSON.stringify({ action: 'redeem_pro', packageId })
    });
};
