import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../utils/types';

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    users: UserProfile[];
    placeholder?: string;
    className?: string;
    maxLength?: number;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

const MentionInput: React.FC<MentionInputProps> = ({ value, onChange, users, placeholder, className, maxLength, onKeyDown }) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionQuery, setSuggestionQuery] = useState('');
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [cursorIndex, setCursorIndex] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const newCursorIndex = e.target.selectionStart;
        
        onChange(newValue);
        setCursorIndex(newCursorIndex);

        // Check for mention trigger
        const textBeforeCursor = newValue.slice(0, newCursorIndex);
        const match = textBeforeCursor.match(/@(\w*)$/);

        if (match) {
            setShowSuggestions(true);
            setSuggestionQuery(match[1].toLowerCase());
            setActiveSuggestionIndex(0);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSelectUser = (username: string) => {
        const textBeforeCursor = value.slice(0, cursorIndex);
        const textAfterCursor = value.slice(cursorIndex);
        
        // Replace the partial mention (e.g. "@us") with the full mention ("@username ")
        const match = textBeforeCursor.match(/@(\w*)$/);
        if (match) {
            const prefix = textBeforeCursor.slice(0, match.index);
            const newValue = `${prefix}@${username} ${textAfterCursor}`;
            onChange(newValue);
            setShowSuggestions(false);
            
            // Restore focus and set cursor after the mention
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    const newIndex = prefix.length + username.length + 2; // @ + space
                    textareaRef.current.setSelectionRange(newIndex, newIndex);
                }
            }, 0);
        }
    };

    const filteredUsers = users
        .filter(u => u.username.toLowerCase().includes(suggestionQuery))
        .slice(0, 5);

    const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showSuggestions && filteredUsers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestionIndex(prev => (prev + 1) % filteredUsers.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestionIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleSelectUser(filteredUsers[activeSuggestionIndex].username);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowSuggestions(false);
                return;
            }
        }
        
        if (onKeyDown) {
            onKeyDown(e);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
                // Don't hide if clicking on the suggestion list itself (handled by onClick on items)
                const target = e.target as HTMLElement;
                if (!target.closest('.mention-suggestion-item')) {
                    setShowSuggestions(false);
                }
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDownInternal}
                placeholder={placeholder}
                className={className}
                rows={3}
                maxLength={maxLength}
            />
            {showSuggestions && filteredUsers.length > 0 && (
                <div className="absolute bottom-full left-0 w-full mb-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                    {filteredUsers.map((user, index) => (
                        <button
                            key={user.uid}
                            type="button"
                            onClick={() => handleSelectUser(user.username)}
                            className={`mention-suggestion-item w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                                index === activeSuggestionIndex 
                                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-white' 
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                        >
                            <img 
                                src={user.photoURL || `https://api.dicebear.com/8.x/initials/svg?size=60&seed=${encodeURIComponent(user.username)}`} 
                                alt={user.username} 
                                className="w-6 h-6 rounded-full object-cover"
                            />
                            <span className="font-medium">{user.username}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MentionInput;