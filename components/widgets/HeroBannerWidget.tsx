
import React from 'react';
import { BannerWidgetData } from '../../utils/types';
import { Link } from 'react-router-dom';
import { transformCloudinaryUrl } from '../../services/cloudinaryUtils';

interface HeroBannerWidgetProps {
  data: BannerWidgetData;
}

const HeroBannerWidget: React.FC<HeroBannerWidgetProps> = ({ data }) => {
  const { imageUrl, title, subtitle, buttonText, buttonLink, height, overlayOpacity } = data;
  
  const heightClass = 
    height === 'small' ? 'h-64' : 
    height === 'large' ? 'h-[500px]' : 
    'h-96'; // medium default

  return (
    <div className={`relative w-full ${heightClass} overflow-hidden rounded-xl shadow-lg group my-8`}>
        <img 
            src={transformCloudinaryUrl(imageUrl, 'w_1600,c_limit,q_auto')} 
            alt={title || 'Banner'} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div 
            className="absolute inset-0 bg-black transition-opacity duration-300" 
            style={{ opacity: overlayOpacity !== undefined ? overlayOpacity / 100 : 0.4 }}
        ></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            {title && <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-3 drop-shadow-lg">{title}</h2>}
            {subtitle && <p className="text-lg md:text-xl text-gray-100 mb-6 max-w-2xl drop-shadow-md">{subtitle}</p>}
            {buttonText && buttonLink && (
                <Link 
                    to={buttonLink}
                    className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 shadow-lg"
                >
                    {buttonText}
                </Link>
            )}
        </div>
    </div>
  );
};

export default HeroBannerWidget;
