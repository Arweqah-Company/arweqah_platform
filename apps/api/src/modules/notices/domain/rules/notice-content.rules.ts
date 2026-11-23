import sanitizeHtml from 'sanitize-html';

/** The formatting a notice may keep: headings, paragraphs, lists, emphasis, tables and links. No script, style, image, frame or event attribute can pass. */
export function sanitizeNoticeBody(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['h2', 'h3', 'h4', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    allowedAttributes: { a: ['href', 'rel', 'target'], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }) },
  }).trim();
}

/** The text of a formatted body, for the excerpt of a card and for search. */
export function plainText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
}

const EXCERPT_LENGTH = 200;

export function excerptOf(html: string): string {
  const text = plainText(html);
  return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…` : text;
}

/** Does the body keep any text once the markup is taken away? (A body of empty tags is empty.) */
export const hasText = (html: string): boolean => plainText(html).length > 0;
