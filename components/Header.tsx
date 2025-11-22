import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { getSettings } from '../services/settingsService';
import Spinner from './Spinner';
import { HeaderStyle } from '../types';

const HeaderStyle1 = lazy(() => import('./headers/HeaderStyle1'));
const HeaderStyle2 = lazy(() => import('./headers/HeaderStyle2'));
const HeaderStyle3 = lazy(() => import('./headers/HeaderStyle3'));

const TABLET_BREAKPOINT_MIN = 768;
const TABLET_BREAKPOINT_MAX = 1024;

/**
 * A custom hook that determines which header style to use based on the current screen width.
 * It listens for resize events and settings changes to stay in sync.
 * @returns The appropriate HeaderStyle ('style1', 'style2', or 'style3').
 */
const useResponsiveHeaderStyle = (): HeaderStyle | undefined => {
    const getStyleForCurrentWidth = useCallback((): HeaderStyle | undefined => {
        const settings = getSettings();
        const width = window.innerWidth;

        if (width >= TABLET_BREAKPOINT_MIN && width < TABLET_BREAKPOINT_MAX) {
            return settings.headerStyleTablet || settings.headerStyle;
        }
        return settings.headerStyle;
    }, []);
    
    const [style, setStyle] = useState(() => getStyleForCurrentWidth());

    useEffect(() => {
        const handleResize = () => {
            const newStyle = getStyleForCurrentWidth();
            if (newStyle !== style) {
                setStyle(newStyle);
            }
        };

        // Also listen for settings changes from other tabs/components
        const handleSettingsChange = () => {
            handleResize(); // Re-evaluate style when settings change
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('storage', handleSettingsChange);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('storage', handleSettingsChange);
        };
    }, [getStyleForCurrentWidth, style]);

    return style;
};


const Header: React.FC<{ isNotificationBarVisible?: boolean }> = ({ isNotificationBarVisible = false }) => {
    const style = useResponsiveHeaderStyle();

    const renderHeader = () => {
        switch (style) {
            case 'style2':
                return <HeaderStyle2 isNotificationBarVisible={isNotificationBarVisible} />;
            case 'style3':
                return <HeaderStyle3 isNotificationBarVisible={isNotificationBarVisible} />;
            case 'style1':
            default:
                return <HeaderStyle1 isNotificationBarVisible={isNotificationBarVisible} />;
        }
    };

    return (
        <Suspense fallback={<header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md sticky top-0 z-50 h-[68px] flex items-center justify-center"><Spinner size="md" /></header>}>
            {renderHeader()}
        </Suspense>
    );
};

export default Header;