
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTicket, getTicketMessages, sendTicketMessage, updateTicketStatus } from '../services/api';
import { SupportTicket, TicketMessage } from '../utils/types';
import Spinner from '../components/Spinner';
import { formatTimeAgo } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';

const SupportTicketDetail: React.FC = () => {
    const { ticketId } = useParams<{ ticketId: string }>();
    const { currentUser, userProfile, isAdmin } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();

    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!ticketId) return;
            setIsLoading(true);
            try {
                const [ticketData, messagesData] = await Promise.all([
                    getTicket(ticketId),
                    getTicketMessages(ticketId)
                ]);
                
                // Security check: only allow admin or ticket owner
                if (!isAdmin && currentUser && ticketData.userId !== currentUser.uid) {
                    navigate('/support');
                    return;
                }

                setTicket(ticketData);
                setMessages(messagesData);
            } catch (error) {
                console.error("Failed to load ticket:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [ticketId, currentUser, isAdmin, navigate]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !ticket || !currentUser || !userProfile) return;

        setIsSending(true);
        try {
            const msg = await sendTicketMessage({
                ticketId: ticket.id,
                senderId: currentUser.uid,
                senderName: userProfile.username,
                text: newMessage,
                isAdminReply: isAdmin
            });
            setMessages([...messages, msg]);
            setNewMessage('');
            
            // If admin replies, maybe update status to 'resolved' or keeping it 'open'
            // If user replies, reopen if closed? (Logic handled by backend usually)
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsSending(false);
        }
    };

    const handleStatusChange = async (newStatus: SupportTicket['status']) => {
        if (!ticket) return;
        try {
            await updateTicketStatus(ticket.id, newStatus);
            setTicket({ ...ticket, status: newStatus });
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
    if (!ticket) return <div className="text-center py-20">Ticket not found.</div>;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 h-[calc(100vh-80px)] flex flex-col">
            <div className="mb-4">
                <button 
                    onClick={() => navigate('/support')} 
                    className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>{t('common.back')}</span> 
                </button>
            </div>

            <div className="mb-4 flex justify-between items-start bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">#{ticket.id.substring(0, 8)} - {ticket.subject}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Category: <span className="capitalize font-medium">{ticket.category}</span> &bull; Created {formatTimeAgo(ticket.createdAt, t)}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full capitalize ${
                        ticket.status === 'open' ? 'bg-green-100 text-green-800' : 
                        ticket.status === 'closed' ? 'bg-gray-200 text-gray-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                        {ticket.status}
                    </span>
                    {isAdmin ? (
                        <select 
                            value={ticket.status} 
                            onChange={(e) => handleStatusChange(e.target.value as any)}
                            className="bg-white p-1.5 text-sm border-gray-300 rounded-full shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="open">Open</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                    ) : (
                        // User Actions: Only allow closing if open/resolved
                        (ticket.status !== 'closed') && (
                            <button 
                                onClick={() => handleStatusChange('closed')}
                                className="text-xs font-bold px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 rounded transition-colors border border-red-200 dark:border-red-800"
                            >
                                Close Ticket
                            </button>
                        )
                    )}
                </div>
            </div>

            <div className="flex-grow bg-gray-50 dark:bg-gray-950/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-y-auto mb-4">
                <div className="space-y-4">
                    {messages.map((msg) => {
                        const isMe = currentUser?.uid === msg.senderId;
                        const isSystem = msg.senderId === 'system'; // Hypothetical system messages
                        
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg p-3 ${
                                    isMe 
                                        ? 'bg-indigo-600 text-white' 
                                        : msg.isAdminReply 
                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-gray-900 dark:text-gray-100 border border-amber-200 dark:border-amber-700'
                                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                                }`}>
                                    <div className="flex items-baseline justify-between gap-4 mb-1">
                                        <span className="text-xs font-bold opacity-90">
                                            {msg.isAdminReply ? `${msg.senderName} (Admin)` : msg.senderName}
                                        </span>
                                        <span className="text-[10px] opacity-70">{new Date(msg.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {ticket.status === 'closed' ? (
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-center text-gray-500 dark:text-gray-400">
                    This ticket is closed. You cannot reply to it.
                </div>
            ) : (
                <form onSubmit={handleSendMessage} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="flex gap-2">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your reply..."
                            className="flex-grow bg-gray-100 dark:bg-gray-700 border-0 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none"
                            rows={2}
                            onKeyDown={(e) => {
                                if(e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                        />
                        <button 
                            type="submit" 
                            disabled={isSending || !newMessage.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-md disabled:opacity-50 flex items-center justify-center"
                        >
                            {isSending ? <Spinner size="sm" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default SupportTicketDetail;
