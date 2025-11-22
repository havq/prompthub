import React, { useState, useEffect, lazy, Suspense } from 'react';
import { getSettings } from '../services/settingsService';

const FooterStyle1 = lazy(() => import('./footers/FooterStyle1'));
const FooterStyle2 = lazy(() => import('./footers/FooterStyle2'));
const FooterStyle3 = lazy(() => import('./footers/FooterStyle3'));

const Footer: React.FC = () => {
    const [style, setStyle] = useState(() => getSettings().footerStyle);

    useEffect(() => {
        const handleSettingsChange = () => {
            setStyle(getSettings().footerStyle);
        };
        window.addEventListener('storage', handleSettingsChange);
        return () => window.removeEventListener('storage', handleSettingsChange);
    }, []);

    const renderFooter = () => {
        switch (style) {
            case 'style2':
                return <FooterStyle2 />;
            case 'style3':
                return <FooterStyle3 />;
            case 'style1':
            default:
                return <FooterStyle1 />;
        }
    };

    return (
        <Suspense fallback={<footer className="h-48 bg-gray-950"></footer>}>
            {renderFooter()}
        </Suspense>
    );
};

export default Footer;