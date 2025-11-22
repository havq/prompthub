import React, { useState } from 'react';
import { Prompt, Post } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getSettings } from '../services/settingsService';
import { buildUrl } from '../utils/permalinks';

interface ShareButtonProps {
  prompt?: Prompt;
  post?: Post;
  shareUrl?: string;
  shareText?: string;
  children: React.ReactNode;
  className?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ prompt, post, shareUrl, shareText, children, className }) => {
  const { t } = useLanguage();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent parent Link/onClick from firing
    
    const { routerMode, appUrl } = getSettings();
    
    let baseUrl = window.location.origin;
    if (appUrl) {
        let tempUrl = appUrl.trim();
        if (!/^https?:\/\//i.test(tempUrl) && tempUrl.includes('.')) {
            tempUrl = 'https://' + tempUrl;
        }
        try {
            const parsed = new URL(tempUrl);
            baseUrl = parsed.origin;
        } catch (e) {
            console.warn("Invalid `appUrl` in settings, falling back to `window.location.origin` for sharing.");
        }
    }

    let path;
    if (prompt) {
      path = buildUrl('prompt', { promptId: prompt.id });
    } else if (post) {
      path = buildUrl('post', { postId: post.id });
    }
    
    const finalUrl = shareUrl || (path ? `${baseUrl}${routerMode === 'hash' ? '/#' : ''}${path}` : window.location.href);
    const text = shareText || post?.title || prompt?.text || 'Check this out!';

    const shareData = {
      title: post?.title || prompt?.title || 'Check out this content!',
      text: text,
      url: finalUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share was canceled or failed:', err);
      }
    } else {
      // Fallback to copying link
      try {
        await navigator.clipboard.writeText(finalUrl);
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
        alert('Failed to copy link.');
      }
    }
  };

  return (
    <div className="relative">
      <button onClick={handleShare} className={className}>
        {children}
      </button>
      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 text-white text-xs rounded py-1 px-2 z-10 animate-pulse">
          {t('common.linkCopied')}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

export default ShareButton;