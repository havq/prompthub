
import React from 'react';
import { RichTextWidgetData } from '../../types';
import { sanitizeHtml } from '../../utils/sanitize';

interface RichTextWidgetProps {
  data: RichTextWidgetData;
}

const RichTextWidget: React.FC<RichTextWidgetProps> = ({ data }) => {
  return (
    <div className={`my-8 ${data.containerClass || ''}`}>
        <div 
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.content) }}
        />
    </div>
  );
};

export default RichTextWidget;
