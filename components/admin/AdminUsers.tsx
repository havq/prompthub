
import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import BadgeIcon from '../BadgeIcon';
import Pagination from '../Pagination';

interface AdminUsersProps {
    users: UserProfile[];
    onAdd: () => void;
    onEdit: (user: UserProfile) => void;
    onDelete: (user: UserProfile) => void;
}

const USERS_PER_PAGE = 10;

const AdminUsers: React.FC<AdminUsersProps> = ({ users, onAdd, onEdit, onDelete }) => {
    const { t } = useLanguage();
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const filteredUsers = useMemo(() => {
        if (userSearchQuery.trim() === '') return users;
        const lowercasedQuery = userSearchQuery.trim().toLowerCase();
        return users.filter(u =>
            u.username.toLowerCase().includes(lowercasedQuery) ||
            u.email.toLowerCase().includes(lowercasedQuery)
        );
    }, [users, userSearchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [userSearchQuery]);

    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * USERS_PER_PAGE;
        return filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
                <h2 className="text-2xl font-bold">{t('admin.users.title')}<span className="text-base font-medium text-gray-500 dark:text-gray-400 ml-2">({filteredUsers.length} total)</span></h2>
                <div className="flex items-center gap-4">
                    <input type="text" placeholder={t('admin.users.searchPlaceholder')} value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)}
                        className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600" />
                    <button onClick={onAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">{t('admin.users.addNew')}</button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                        <tr>
                            <th className="p-3">{t('admin.users.usernameHeader')}</th><th className="p-3">{t('admin.users.emailHeader')}</th><th className="p-3">{t('admin.users.roleHeader')}</th><th className="p-3">{t('admin.users.badgesHeader')}</th><th className="p-3">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.length > 0 ? paginatedUsers.map(user => (
                            <tr key={user.uid} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 font-medium text-gray-900 dark:text-white">{user.username}</td>
                                <td className="p-3 text-gray-600 dark:text-gray-300">{user.email}</td>
                                <td className="p-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'Admin' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'}`}>{user.role}</span></td>
                                <td className="p-3"><div className="flex items-center gap-1.5">{user.badges && user.badges.length > 0 ? user.badges.map(badge => <BadgeIcon key={badge} badge={badge} size="sm" />) : <span className="text-xs text-gray-400 dark:text-gray-500">—</span>}</div></td>
                                <td className="p-3"><div className="flex space-x-2"><button onClick={() => onEdit(user)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">{t('common.edit')}</button><button onClick={() => onDelete(user)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">{t('common.delete')}</button></div></td>
                            </tr>
                        )) : (<tr><td colSpan={5} className="text-center p-4 text-gray-500 dark:text-gray-400">{t('admin.users.noUsersFound')}</td></tr>)}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
        </div>
    );
};

export default AdminUsers;
