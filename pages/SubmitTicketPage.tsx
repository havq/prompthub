
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createTicket, sendTicketMessage } from '../services/api';
import Spinner from '../components/Spinner';
import { useLanguage } from '../context/LanguageContext';

const SubmitTicketPage: React.FC = () => {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();
    
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState('general');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !userProfile || !subject.trim() || !message.trim()) return;

        setIsSubmitting(true);
        try {
            // 1. Create the ticket
            const newTicket = await createTicket({
                userId: currentUser.uid,
                username: userProfile.username,
                userEmail: userProfile.email,
                subject: subject,
                category: category as any,
            });

            // 2. Create the first message
            await sendTicketMessage({
                ticketId: newTicket.id,
                senderId: currentUser.uid,
                senderName: userProfile.username,
                text: message,
                isAdminReply: false
            });

            navigate(`/support/${newTicket.id}`);
        } catch (error) {
            console.error("Failed to create ticket:", error);
            alert("Failed to submit ticket. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Create New Support Ticket</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                        <input 
                            type="text" 
                            value={subject} 
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            required
                            placeholder="Briefly describe your issue"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                        <select 
                            value={category} 
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            <option value="general">General Inquiry</option>
                            <option value="technical">Technical Issue</option>
                            <option value="billing">Billing / Payment</option>
                            <option value="report">Report Content/User</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                        <textarea 
                            value={message} 
                            onChange={(e) => setMessage(e.target.value)}
                            rows={6}
                            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            required
                            placeholder="Provide details about your issue..."
                        />
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button 
                            type="button" 
                            onClick={() => navigate('/support')}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md transition-colors flex items-center justify-center w-32"
                        >
                            {isSubmitting ? <Spinner size="sm" /> : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubmitTicketPage;
