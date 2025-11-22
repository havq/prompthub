
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SupportTicket } from '../../types';
import { getTickets, deleteTicket } from '../../services/api';
import Spinner from '../Spinner';
import { formatTimeAgo } from '../../utils/formatters';
import { useLanguage } from '../../context/LanguageContext';
import ConfirmModal from '../ConfirmModal';

const AdminSupport: React.FC = () => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('open');
    const { t } = useLanguage();

    const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    useEffect(() => {
        const fetchAllTickets = async () => {
            setIsLoading(true);
            try {
                // Fetch all tickets (admin privileges)
                const data = await getTickets();
                setTickets(data);
            } catch (error) {
                console.error("Failed to fetch tickets:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllTickets();
    }, []);

    const filteredTickets = useMemo(() => {
        if (statusFilter === 'all') return tickets;
        return tickets.filter(t => t.status === statusFilter);
    }, [tickets, statusFilter]);

    // Reset selection when filter changes
    useEffect(() => {
        setSelectedTickets([]);
    }, [statusFilter]);

    const statusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            case 'resolved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleDeleteTicket = async () => {
        if (!deletingTicketId) return;
        setIsDeleting(true);
        try {
            await deleteTicket(deletingTicketId);
            setTickets(prev => prev.filter(t => t.id !== deletingTicketId));
            setDeletingTicketId(null);
            setSelectedTickets(prev => prev.filter(id => id !== deletingTicketId));
        } catch (error) {
            console.error("Failed to delete ticket:", error);
            alert("Failed to delete ticket.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleSelectAll = () => {
        if (selectedTickets.length === filteredTickets.length && filteredTickets.length > 0) {
            setSelectedTickets([]);
        } else {
            setSelectedTickets(filteredTickets.map(t => t.id));
        }
    };

    const handleToggleSelectOne = (id: string) => {
        setSelectedTickets(prev => 
            prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true);
        try {
            await Promise.all(selectedTickets.map(id => deleteTicket(id)));
            setTickets(prev => prev.filter(t => !selectedTickets.includes(t.id)));
            setSelectedTickets([]);
        } catch (error) {
            console.error("Failed to bulk delete tickets:", error);
            alert("Failed to delete selected tickets.");
        } finally {
            setIsBulkDeleting(false);
            setIsBulkDeleteConfirmOpen(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            {deletingTicketId && (
                <ConfirmModal
                    isOpen={!!deletingTicketId}
                    onClose={() => setDeletingTicketId(null)}
                    onConfirm={handleDeleteTicket}
                    title={t('common.delete')}
                    message="Are you sure you want to delete this ticket? This action cannot be undone."
                    confirmText={t('common.delete')}
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                    isConfirming={isDeleting}
                />
            )}

            {isBulkDeleteConfirmOpen && (
                <ConfirmModal
                    isOpen={isBulkDeleteConfirmOpen}
                    onClose={() => setIsBulkDeleteConfirmOpen(false)}
                    onConfirm={handleBulkDelete}
                    title={t('common.delete')}
                    message={`Are you sure you want to delete ${selectedTickets.length} selected tickets? This action cannot be undone.`}
                    confirmText={t('common.delete')}
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                    isConfirming={isBulkDeleting}
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h2>
                <div className="flex gap-2">
                    {selectedTickets.length > 0 && (
                        <button 
                            onClick={() => setIsBulkDeleteConfirmOpen(true)} 
                            className="px-3 py-1 rounded-md text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                            Delete ({selectedTickets.length})
                        </button>
                    )}
                    <button onClick={() => setStatusFilter('open')} className={`px-3 py-1 rounded-md text-sm font-medium ${statusFilter === 'open' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Open</button>
                    <button onClick={() => setStatusFilter('resolved')} className={`px-3 py-1 rounded-md text-sm font-medium ${statusFilter === 'resolved' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Resolved</button>
                    <button onClick={() => setStatusFilter('closed')} className={`px-3 py-1 rounded-md text-sm font-medium ${statusFilter === 'closed' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Closed</button>
                    <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 rounded-md text-sm font-medium ${statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>All</button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : filteredTickets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No tickets found.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <input 
                                        type="checkbox" 
                                        checked={filteredTickets.length > 0 && selectedTickets.length === filteredTickets.length}
                                        onChange={handleToggleSelectAll}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded bg-gray-100 dark:bg-gray-600 dark:border-gray-500"
                                    />
                                </th>
                                <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-300">Subject</th>
                                <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-300">User</th>
                                <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-300">Category</th>
                                <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-300">Status</th>
                                <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-300">Created</th>
                                <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                            {filteredTickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedTickets.includes(ticket.id)}
                                            onChange={() => handleToggleSelectOne(ticket.id)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded bg-gray-100 dark:bg-gray-600 dark:border-gray-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link to={`/support/${ticket.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                                            {ticket.subject}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                        <div>{ticket.username}</div>
                                        <div className="text-xs text-gray-500">{ticket.userEmail}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm capitalize text-gray-700 dark:text-gray-300">{ticket.category}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColor(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                        {formatTimeAgo(ticket.createdAt, t)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Link to={`/support/${ticket.id}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800">
                                                View
                                            </Link>
                                            <button 
                                                onClick={() => setDeletingTicketId(ticket.id)}
                                                className="text-sm text-red-600 dark:text-red-400 hover:text-red-800"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminSupport;
