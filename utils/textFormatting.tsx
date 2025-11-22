import React from 'react';
import { Link } from 'react-router-dom';
import { buildUrl } from './permalinks';

export const renderTextWithMentions = (text: string): React.ReactNode => {
    if (!text) return null;

    // Split by @mentions, capturing the username
    // Regex: (@\w+) matches @ followed by word characters (alphanumeric + underscore)
    const parts = text.split(/(@\w+)/g);

    return (
        <>
            {parts.map((part, index) => {
                if (part.match(/^@\w+$/)) {
                    const username = part.substring(1); // Remove @
                    // Note: We assume a route exists to find a user by username or we link to a search.
                    // Ideally, mentions store ID, but for simple text parsing, we link to a profile search or assume ID lookup isn't possible directly from text without metadata.
                    // Given the current architecture, we'll link to the author page if we can resolve it, 
                    // but since we only have the username string here, we might need to link to a search or just the author route if we assume username is unique/searchable.
                    // Currently `buildUrl('author', { authorId: ... })` needs an ID. 
                    // Since we don't have the ID here easily without complex lookup logic in the display component,
                    // we will style it as a mention but maybe link to a user search page or just keep it highlighted.
                    
                    // IMPROVEMENT: If we want clickable links to profiles, we'd need to store metadata or look it up.
                    // For this implementation, we will render it as a highlighted span, or link to a search page.
                    // Let's link to the community page with a search filter as a fallback.
                    
                    return (
                        <Link 
                            key={index} 
                            to={`/community?searchTerm=${encodeURIComponent(username)}`}
                            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                            title={`View ${username}`}
                        >
                            {part}
                        </Link>
                    );
                }
                return <span key={index}>{part}</span>;
            })}
        </>
    );
};