
/**
 * Sanitizes HTML string by removing dangerous tags and attributes.
 * This is a client-side protection against Stored XSS.
 * @param html The HTML string to sanitize.
 * @returns The sanitized HTML string.
 */
export const sanitizeHtml = (html: string): string => {
    if (!html) return '';
    if (typeof window === 'undefined') return html; // Server-side safe return

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const elements = doc.body.querySelectorAll('*');

    // List of tags to completely remove
    const forbiddenTags = ['script', 'iframe', 'object', 'embed', 'link', 'style', 'form', 'input', 'meta', 'base', 'applet', 'button', 'svg'];
    
    // List of allowed attributes (others will be stripped, except data-*)
    const allowedAttributes = ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel', 'width', 'height', 'controls', 'poster', 'preload'];

    elements.forEach(el => {
        // 1. Remove forbidden tags
        if (forbiddenTags.includes(el.tagName.toLowerCase())) {
            el.remove();
            return;
        }

        // 2. Clean attributes
        const attrs = Array.from(el.attributes);
        attrs.forEach(attr => {
            const attrName = attr.name.toLowerCase();
            const attrValue = attr.value.toLowerCase().trim();
            
            // Remove event handlers (on*)
            if (attrName.startsWith('on')) {
                el.removeAttribute(attr.name);
                return;
            }

            // Allow specific attributes and data- attributes, remove others
            if (!allowedAttributes.includes(attrName) && !attrName.startsWith('data-')) {
                el.removeAttribute(attr.name);
                return;
            }

            // 3. Prevent javascript: and vbscript: URI injection in src and href
            // Also block 'data:' protocol to prevent base64 encoded exploits (unless strictly controlled, better block all for generic content)
            if ((attrName === 'href' || attrName === 'src')) {
                 if (
                     attrValue.startsWith('javascript:') || 
                     attrValue.startsWith('vbscript:') || 
                     attrValue.startsWith('data:')
                 ) {
                     el.removeAttribute(attr.name);
                 }
            }
            
            // 4. Remove style attribute entirely to prevent CSS injection attacks
            if (attrName === 'style') {
                el.removeAttribute(attr.name);
            }
        });
    });

    return doc.body.innerHTML;
};
