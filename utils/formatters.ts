
import { Language } from '../context/LanguageContext';

export const formatCount = (count: number | undefined): string => {
    const num = Number(count || 0);
    if (num < 1000) return num.toLocaleString();
    const units = ['k', 'm', 'b', 't'];
    const unit = Math.floor((num.toFixed(0).length - 1) / 3) - 1;
    if (unit >= units.length) return num.toLocaleString();
    const value = num / Math.pow(1000, unit + 1);
    const truncatedValue = Math.floor(value * 10) / 10;
    return String(truncatedValue) + units[unit];
};

export const formatTimeAgo = (isoDate: string, t: (key: string, options?: any) => string): string => {
    let parsableDateString = isoDate.replace(' ', 'T');
    if (!/Z|[+-]\d{2}(:?\d{2})?$/.test(parsableDateString)) {
        parsableDateString += 'Z';
    }
    const now = new Date();
    const past = new Date(parsableDateString);
    if (isNaN(past.getTime())) return isoDate;

    const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    if (seconds < 60) return t('notifications.time.now');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('notifications.time.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('notifications.time.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('notifications.time.daysAgo', { count: days });
    return past.toLocaleDateString();
};