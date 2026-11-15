import DOMPurify from 'dompurify';
import { useEffect, useRef } from 'react';
import { cn } from '../lib/cn';

const ALLOWED = { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a'], ALLOWED_ATTR: ['href'], ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i };

let hooked = false;

/** Links open in a new tab and carry no referrer (set once, on the sanitizer). */
function sanitize(html: string): DocumentFragment {
  if (!hooked) {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow');
      }
    });
    hooked = true;
  }
  return DOMPurify.sanitize(html, { ...ALLOWED, RETURN_DOM_FRAGMENT: true });
}

/** Shows formatted text written in `RichTextEditor`, cleaned again in the browser and added as DOM nodes, never as an HTML string (no script, image or event attribute gets through). */
export function RichText({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.replaceChildren(sanitize(html));
  }, [html]);
  return <div ref={ref} className={cn('[&_a]:text-link [&_a]:underline [&_ol]:list-decimal [&_ol]:ps-6 [&_p]:my-1 [&_ul]:list-disc [&_ul]:ps-6', className)} />;
}
