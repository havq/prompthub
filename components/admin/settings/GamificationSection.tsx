
import React from 'react';
import { GamificationSettings } from '../../../utils/types';
import CollapsibleSection from './CollapsibleSection';

interface GamificationSectionProps {
    settings: GamificationSettings;
    onChange: (field: keyof GamificationSettings, value: number) => void;
    t: (key: string) => string;
}

const PointInput: React.FC<{label: string, value: number, onChange: (val: number) => void}> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <input
            type="number"
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            min="0"
            className="mt-1 w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 border border-gray-300 dark:border-gray-600"
        />
    </div>
);

const GamificationSection: React.FC<GamificationSectionProps> = ({ settings, onChange, t }) => {
    return (
        <CollapsibleSection title="Gamification & Points">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Configure the number of points users earn for various community interactions.
            </p>
            <div className="space-y-4">
                <PointInput 
                    label="Points for New User Registration"
                    value={settings.registrationBonus}
                    onChange={val => onChange('registrationBonus', val)}
                />
                <PointInput 
                    label="Points for a 5-Star Rating"
                    value={settings.rating5Star}
                    onChange={val => onChange('rating5Star', val)}
                />
                <PointInput 
                    label="Points when Prompt is Favorited"
                    value={settings.promptFavorited}
                    onChange={val => onChange('promptFavorited', val)}
                />
                <PointInput 
                    label="Points when Prompt is Added to a Collection"
                    value={settings.promptCollected}
                    onChange={val => onChange('promptCollected', val)}
                />
                <PointInput 
                    label="Points when Prompt is Remixed"
                    value={settings.promptRemixed}
                    onChange={val => onChange('promptRemixed', val)}
                />
                <PointInput 
                    label="Points for Receiving a Comment"
                    value={settings.commentReceived}
                    onChange={val => onChange('commentReceived', val)}
                />
            </div>
        </CollapsibleSection>
    );
};

export default GamificationSection;