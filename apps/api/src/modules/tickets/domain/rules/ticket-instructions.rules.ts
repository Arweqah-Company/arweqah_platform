import sanitizeHtml from 'sanitize-html';

/** The formatting the instructions of a type may keep: no script, style, image or event attribute can pass. */
export function sanitizeInstructions(html: string | null | undefined): string | null {
  if (!html) return null;
  const clean = sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }) },
  });
  const hasText = sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).trim().length > 0;
  return hasText ? clean : null;
}
