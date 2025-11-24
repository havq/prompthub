import React, { useState, useRef, useEffect } from 'react';
// @ts-ignore
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../utils/types';
import { useLanguage } from '../context/LanguageContext';
import ConfirmModal from './ConfirmModal';

const formatTimeAgo = (isoDate: string, t: (key: string, options?: any) => string): string => {
    // Để đảm bảo các dấu thời gian từ nhiều nguồn khác nhau được phân tích chính xác dưới dạng UTC,
    // chúng tôi định dạng chúng một chút. Chúng tôi thay thế khoảng trắng tiềm ẩn giữa ngày và giờ bằng 'T',
    // và nếu không có thông tin múi giờ ('Z' hoặc độ lệch +/-), chúng tôi sẽ thêm 'Z' vào
    // để buộc diễn giải theo UTC. Điều này ngăn trình duyệt giả định thời gian cục bộ.
    let parsableDateString = isoDate.replace(' ', 'T');
    if (!/Z|[+-]\d{2}(:?\d{2})?$/.test(parsableDateString)) {
        parsableDateString += 'Z';
    }
    
    const now = new Date();
    const past = new Date(parsableDateString);

    // Nếu phân tích cú pháp thất bại, trả về một chuỗi mặc định để tránh sự cố.
    if (isNaN(past.getTime())) {
        console.warn(`Could not parse date: ${isoDate}`);
        return isoDate;
    }
    
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


const NotificationPopover: React.FC = () => {
    const { notifications, unreadNotificationCount, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications, isAdmin } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { t } = useLanguage();
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (e: React.MouseEvent, notification: Notification) => {
        const target = e.target as HTMLElement;
        if (target.closest('.delete-notification-btn')) {
            return;
        }

        markAsRead(notification.id, notification.type);
        setIsOpen(false);
        
        // Note: promptId column is used for storing ticketId in ticket notifications to reuse DB schema
        switch(notification.type) {
            case 'follow':
                if (notification.actorId) navigate(`/author/${notification.actorId}`);
                break;
            case 'favorite':
            case 'collection':
            case 'remix':
            case 'comment':
            case 'showcase':
            case 'rating':
            case 'prompt-approved':
            case 'prompt-rejected':
            case 'prompt-comment-mention':
                if (notification.promptId) {
                    navigate(`/?prompt=${notification.promptId}`);
                }
                break;
            case 'comment-reply':
            case 'comment-like':
            case 'comment-mention':
                if (notification.reelId) {
                    navigate(`/reels/${notification.reelId}`, { 
                        state: { 
                            openComments: true, 
                            commentId: notification.commentId 
                        } 
                    });
                } else if (notification.promptId) {
                    navigate(`/?prompt=${notification.promptId}`);
                }
                break;
            case 'badge-unlocked':
                navigate('/profile');
                break;
            case 'ticket_created':
            case 'ticket_reply':
            case 'ticket_status':
                // 'promptId' stores 'ticketId' in DB
                if (notification.promptId) {
                    navigate(`/support/${notification.promptId}`);
                }
                break;
        }
    }
    
    const getNotificationMessage = (n: Notification): React.ReactNode => {
        const actor = <strong className="font-semibold">{n.actorName || t('notifications.someone')}</strong>;
        switch(n.type) {
            case 'follow': return <><span className="inline-flex items-center gap-x-1.5 py-1 px-3 rounded-md text-xs font-medium bg-gray-800 text-white dark:bg-white dark:text-neutral-800">{actor}</span> {t('notifications.followedYou')}</>;

            case 'favorite': return <><span className="inline-flex items-center gap-x-1.5 py-1 px-3 rounded-md text-xs font-medium bg-gray-800 text-white dark:bg-white dark:text-neutral-800">{actor}</span> {t('notifications.favorited', { prompt: n.promptText })}</>;

            case 'collection': return <><span className="inline-flex items-center gap-x-1.5 py-1 px-3 rounded-md text-xs font-medium bg-gray-800 text-white dark:bg-white dark:text-neutral-800">{actor}</span> {t('notifications.collected', { prompt: n.promptText, collection: n.collectionName })}</>;

            case 'remix': return <><span className="inline-flex items-center gap-x-1.5 py-1 px-3 rounded-md text-xs font-medium bg-gray-800 text-white dark:bg-white dark:text-neutral-800">{actor}</span> {t('notifications.remixed', { prompt: n.promptText })}</>;

            case 'comment': return <><span className="inline-flex items-center gap-x-1.5 py-1 px-3 rounded-md text-xs font-medium bg-gray-800 text-white dark:bg-white dark:text-neutral-800">{actor}</span> {t('notifications.commented', { prompt: n.promptText })}</>;

            case 'showcase': return <><span className="inline-flex items-center gap-x-1.5 py-1 px-3 rounded-md text-xs font-medium bg-gray-800 text-white dark:bg-white dark:text-neutral-800">{actor}</span> {t('notifications.showcased', { prompt: n.promptText })}</>;

            case 'badge-unlocked': return <>{t('notifications.badgeUnlocked', { badge: t(`badges.${n.badgeName}.title` as any) })}</>;

            case 'rating': return <><span className="inline-flex items-center gap-x-1.5 py-1 px-3 rounded-md text-xs font-medium bg-gray-800 text-white dark:bg-white dark:text-neutral-800">{actor}</span> {t('notifications.rated', { prompt: n.promptText, rating: n.ratingValue ?? '?' })}</>;

            case 'prompt-approved': return <>{t('notifications.promptApproved', { prompt: n.promptText ?? 'your prompt' })}</>;
            case 'prompt-rejected': return <>{t('notifications.promptRejected', { prompt: n.promptText ?? 'your prompt' })}</>;

            case 'comment-reply': return <><span className="inline-flex items-center gap-x-1.5 py-1 px-3 rounded-md text-xs font-medium bg-gray-800 text-white dark:bg-white dark:text-neutral-800">{actor}</span> {t('notifications.commentReply', { commentText: n.commentText })}</>;
            case 'comment-like': return <><span className="inline-flex items-center gap-x-1.5 py-1 px-3 rounded-md text-xs font-medium bg-gray-800 text-white dark:bg-white dark:text-neutral-800">{actor}</span> {t('notifications.commentLike', { commentText: n.commentText })}</>;
            case 'comment-mention': return <><span className="inline-flex items-center gap-x-1.5 py-1 px-3 rounded-md text-xs font-medium bg-gray-800 text-white dark:bg-white dark:text-neutral-800">{actor}</span> {t('notifications.commentMention')}</>;
            case 'prompt-comment-mention': return <><span className="inline-flex items-center gap-x-1.5 py-1 px-3 rounded-md text-xs font-medium bg-gray-800 text-white dark:bg-white dark:text-neutral-800">{actor}</span> {t('notifications.promptCommentMention')}</>;

            case 'ticket_created': return <>{t('notifications.ticketCreated', { user: n.actorName, subject: n.promptText })}</>;
            case 'ticket_reply': return <>{t('notifications.ticketReply', { user: n.actorName, snippet: n.promptText })}</>;
            case 'ticket_status': return <>{t('notifications.ticketStatus', { status: n.promptText })}</>;

            default: return 'New notification';
        }
    }


    return (
        <>
            {isConfirmingDelete && (
                <ConfirmModal
                    isOpen={isConfirmingDelete}
                    onClose={() => setIsConfirmingDelete(false)}
                    onConfirm={() => {
                        deleteAllNotifications();
                        setIsConfirmingDelete(false);
                    }}
                    title={t('notifications.deleteAllConfirmTitle')}
                    message={t('notifications.deleteAllConfirmMessage')}
                    confirmText={t('common.delete')}
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                />
            )}
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-indigo-500"
                    aria-label="View notifications"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadNotificationCount > 0 && (
                        <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
                            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                        </span>
                    )}
                </button>
                {isOpen && (
                    <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[90vw] max-w-sm md:absolute md:w-96 md:top-full md:right-0 md:mt-2 md:left-auto md:transform-none bg-white dark:bg-gray-700 rounded-lg shadow-2xl z-50 ring-1 ring-black ring-opacity-5 flex flex-col">
                        <div className="p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-600">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{t('notifications.title')}</h3>
                            {unreadNotificationCount > 0 && (
                                <button onClick={() => markAllAsRead()} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{t('notifications.markAllRead')}</button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-96">
                            {notifications.length > 0 ? (
                                notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={(e) => handleNotificationClick(e, n)}
                                        className={`group flex items-start p-3 space-x-3 transition-colors cursor-pointer ${!n.read ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''} hover:bg-gray-100 dark:hover:bg-gray-600`}
                                    >
                                        <div className="flex-shrink-0">
                                            <img className="h-9 w-9 rounded-full object-cover" src={n.actorPhotoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(n.actorName || 'A')}`} alt={n.actorName} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-700 dark:text-gray-200">{getNotificationMessage(n)}</p>
                                            <time className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(n.createdAt, t)}</time>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }} className="delete-notification-btn opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">{t('notifications.noNotifications')}</p>
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <div className="p-2 border-t border-gray-200 dark:border-gray-600">
                                <p className="text-xs text-center text-gray-500 dark:text-gray-400 px-2 py-1">{t('notifications.autoDeleteNotice')}</p>
                                <button onClick={() => setIsConfirmingDelete(true)} className="w-full text-center text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 py-1.5 rounded-md">{t('notifications.deleteAll')}</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};
export default NotificationPopover;
