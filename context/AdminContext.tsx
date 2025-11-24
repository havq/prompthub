import React, { createContext, useContext } from 'react';
import { Prompt, Post, Reel, CategoryWithCount, PostCategoryWithCount, ReelCategoryWithCount, Report, UserProfile, StaticPage, ShowcaseImage, SupportTicket } from '../utils/types';

export interface AdminContextType {
    prompts: Prompt[];
    posts: Post[];
    reels: Reel[];
    categories: CategoryWithCount[];
    postCategories: PostCategoryWithCount[];
    reelCategories: ReelCategoryWithCount[];
    reports: Report[];
    users: UserProfile[];
    staticPages: StaticPage[];
    showcaseImages: ShowcaseImage[];
    tickets: SupportTicket[];
    isLoading: boolean;
    refreshData: () => void;
}

export const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdminContext = (): AdminContextType => {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdminContext must be used within an AdminProvider');
    }
    return context;
};