
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SupportTicket } from '../types';
import { getTickets } from '../services/api';
import Spinner from '../components/Spinner';
import { formatTimeAgo } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';

const SupportPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { t } = useLanguage();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTickets = async () => {
            if (!currentUser) return;
            setIsLoading(true);
            try {
                const data = await getTickets(currentUser.uid);
                setTickets(data);
            } catch (error) {
                console.error("Failed to fetch tickets:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTickets();
    }, [currentUser]);

    const statusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            case 'resolved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
                <Link to="/support/new" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                    + New Ticket
                </Link>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : tickets.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <p className="text-gray-500 dark:text-gray-400">You haven't created any support tickets yet.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {tickets.map((ticket) => (
                            <li key={ticket.id}>
                                <Link to={`/support/${ticket.id}`} className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition duration-150 ease-in-out">
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                                                    {ticket.subject}
                                                </p>
                                                {ticket.lastReplyByAdmin && ticket.status !== 'closed' && (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-bold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 animate-pulse">
                                                        New Reply
                                                    </span>
                                                )}
                                            </div>
                                            <div className="ml-2 flex-shrink-0 flex">
                                                <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor(ticket.status)}`}>
                                                    {ticket.status}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                                <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                    <span className="capitalize mr-1">{ticket.category}</span>
                                                </p>
                                            </div>
                                            <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                                                <p>
                                                    Created {formatTimeAgo(ticket.createdAt, t)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SupportPage;
