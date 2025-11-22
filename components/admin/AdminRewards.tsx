
import React, { useState, useEffect } from 'react';
import { AppSettings, RewardPackage, UserProfile } from '../../types';
import { getSettings, saveSettings } from '../../services/settingsService';
import { findUserByUsername, updateUserProfile } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import Spinner from '../Spinner';
import { Toggle } from './settings/SharedComponents';

const AdminRewards: React.FC = () => {
    const { t } = useLanguage();
    const [packages, setPackages] = useState<RewardPackage[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
    
    // Point Management State
    const [searchUsername, setSearchUsername] = useState('');
    const [foundUser, setFoundUser] = useState<Partial<UserProfile> | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [pointsToSet, setPointsToSet] = useState<number>(0);
    const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);
    const [pointsMessage, setPointsMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

    useEffect(() => {
        const settings = getSettings();
        if (settings.rewardPackages) {
            setPackages(settings.rewardPackages);
        }
    }, []);

    const handlePackageChange = (index: number, field: keyof RewardPackage, value: any) => {
        const newPackages = [...packages];
        (newPackages[index] as any)[field] = value;
        setPackages(newPackages);
    };

    const handleSavePackages = async () => {
        setIsSaving(true);
        try {
            await saveSettings({ rewardPackages: packages });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Failed to save reward packages:", error);
            alert("Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSearchUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchUsername.trim()) return;
        
        setIsSearching(true);
        setSearchError('');
        setFoundUser(null);
        setPointsMessage(null);
        
        try {
            const user = await findUserByUsername(searchUsername);
            if (user) {
                setFoundUser(user);
                setPointsToSet(user.points || 0);
            } else {
                setSearchError('User not found.');
            }
        } catch (error) {
            setSearchError('Error searching for user.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleUpdatePoints = async () => {
        if (!foundUser || !foundUser.uid) return;
        
        setIsUpdatingPoints(true);
        setPointsMessage(null);
        
        try {
            await updateUserProfile(foundUser.uid, { points: pointsToSet });
            setFoundUser(prev => ({ ...prev, points: pointsToSet }));
            setPointsMessage({ type: 'success', text: 'Points updated successfully!' });
        } catch (error) {
            console.error("Failed to update points:", error);
            setPointsMessage({ type: 'error', text: 'Failed to update points.' });
        } finally {
            setIsUpdatingPoints(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Reward Packages Configuration</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Configure the point costs and duration for Pro membership redemptions.</p>
                
                <div className="space-y-4">
                    {packages.map((pkg, index) => (
                        <div key={pkg.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">{pkg.label} (ID: {pkg.id})</h4>
                                <Toggle checked={pkg.enabled} onChange={val => handlePackageChange(index, 'enabled', val)} label="" hint="" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Label</label>
                                    <input 
                                        type="text" 
                                        value={pkg.label} 
                                        onChange={e => handlePackageChange(index, 'label', e.target.value)} 
                                        className="w-full text-sm border rounded p-2 bg-white dark:bg-gray-600 dark:border-gray-500 dark:text-white" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Points Cost</label>
                                    <input 
                                        type="number" 
                                        value={pkg.points} 
                                        onChange={e => handlePackageChange(index, 'points', Number(e.target.value))} 
                                        className="w-full text-sm border rounded p-2 bg-white dark:bg-gray-600 dark:border-gray-500 dark:text-white" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Duration (Days)</label>
                                    <input 
                                        type="number" 
                                        value={pkg.days} 
                                        onChange={e => handlePackageChange(index, 'days', Number(e.target.value))} 
                                        className="w-full text-sm border rounded p-2 bg-white dark:bg-gray-600 dark:border-gray-500 dark:text-white" 
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={handleSavePackages} 
                        disabled={isSaving} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition-colors flex items-center"
                    >
                        {isSaving ? <Spinner size="sm" className="mr-2"/> : null}
                        {saveStatus === 'saved' ? 'Saved!' : 'Save Packages'}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Manage User Points</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Manually adjust points for a specific user.</p>
                
                <form onSubmit={handleSearchUser} className="flex gap-2 mb-6">
                    <input 
                        type="text" 
                        value={searchUsername} 
                        onChange={e => setSearchUsername(e.target.value)} 
                        placeholder="Enter username to search..." 
                        className="flex-grow bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-600"
                    />
                    <button 
                        type="submit" 
                        disabled={isSearching}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                    >
                        {isSearching ? <Spinner size="sm" /> : 'Search'}
                    </button>
                </form>
                
                {searchError && <p className="text-red-500 text-sm mb-4">{searchError}</p>}
                
                {foundUser && (
                    <div className="p-6 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-4 mb-6">
                            <img src={foundUser.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(foundUser.username || 'U')}`} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white">{foundUser.username}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{foundUser.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${foundUser.isPro ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-800'}`}>
                                        {foundUser.isPro ? 'Pro Member' : 'Free Member'}
                                    </span>
                                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                        Current Points: {foundUser.points?.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Set New Point Balance</label>
                            <div className="flex gap-4 items-center">
                                <input 
                                    type="number" 
                                    value={pointsToSet} 
                                    onChange={e => setPointsToSet(Number(e.target.value))} 
                                    className="w-40 bg-white dark:bg-gray-600 text-gray-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 dark:border-gray-500"
                                    min="0"
                                />
                                <button 
                                    onClick={handleUpdatePoints} 
                                    disabled={isUpdatingPoints} 
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition-colors flex items-center"
                                >
                                    {isUpdatingPoints ? <Spinner size="sm" className="mr-2"/> : null} Update Points
                                </button>
                            </div>
                            {pointsMessage && (
                                <p className={`mt-2 text-sm ${pointsMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {pointsMessage.text}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminRewards;
