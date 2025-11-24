import { getSettings } from './settingsService';
import { GamificationSettings } from '../utils/types';

export const getPointsConfig = (): Required<GamificationSettings> => {
    const settings = getSettings();
    return {
        promptFavorited: 1,
        promptCollected: 2,
        promptRemixed: 5,
        rating5Star: 2,
        commentReceived: 1,
        ...settings.gamificationSettings
    };
};

export const BADGE_THRESHOLDS: Record<string, number> = {
    PROLIFIC_CREATOR: 10,
    MASTER_CREATOR: 50,
    REMIX_ARTIST: 5,
    REMIX_MASTER: 25,
    CURATOR: 5,
};

export const LEVEL_SCALING_FACTOR = 100;

export interface LevelInfo {
    level: number;
    points: number;
    currentLevelXp: number;
    nextLevelXp: number;
    progress: number; // 0-100
}

export const getPointsForLevel = (level: number): number => {
    if (level <= 1) return 0;
    return LEVEL_SCALING_FACTOR * Math.pow(level - 1, 2);
};

export const calculateLevel = (points: number = 0): LevelInfo => {
    if (points < 0) points = 0;

    const level = Math.floor(Math.sqrt(points / LEVEL_SCALING_FACTOR)) + 1;
    
    const currentLevelXp = getPointsForLevel(level);
    const nextLevelXp = getPointsForLevel(level + 1);

    const xpInLevel = points - currentLevelXp;
    const xpForNextLevel = nextLevelXp - currentLevelXp;
    
    const progress = xpForNextLevel > 0 ? Math.floor((xpInLevel / xpForNextLevel) * 100) : 0;
    
    return {
        level,
        points,
        currentLevelXp,
        nextLevelXp,
        progress
    };
};
