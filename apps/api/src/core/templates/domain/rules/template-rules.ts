import { isDeepStrictEqual } from 'node:util';
import sanitizeHtml from 'sanitize-html';
import { BRAND_COLORS, VARIABLE_PATTERN, type BrandColor, type LocalizedTemplateContent, type TemplateContent, type TemplateKind } from '@arweqah-platform/shared';
import type { TemplateDefinition, TemplateValues } from '../types/template.types';

const TEXT_FIELDS = ['title', 'preheader', 'buttonText', 'body'] as const;

/** The variables written in a text, once each, in order of appearance. */
export function variablesIn(text: string): string[] {
  return [...new Set([...text.matchAll(VARIABLE_PATTERN)].map((m) => m[1]!))];
}

function usedIn(content: LocalizedTemplateContent): Set<string> {
  return new Set(TEXT_FIELDS.flatMap((f) => variablesIn(content[f])));
}

/** Variables used in the wording that the template's code cannot fill. */
export function unknownVariables(def: TemplateDefinition, content: TemplateContent): string[] {
  const known = new Set(def.variables.map((v) => v.name));
  return [...new Set([...usedIn(content.ar), ...usedIn(content.en)])].filter((name) => !known.has(name));
}

/** Required variables a language no longer carries; `link` counts as carried when the button has a label (the button holds the link). */
export function missingVariables(def: TemplateDefinition, content: TemplateContent): string[] {
  const missing = new Set<string>();
  for (const lang of ['ar', 'en'] as const) {
    const used = usedIn(content[lang]);
    for (const v of def.variables.filter((x) => x.required)) {
      const byButton = v.name === 'link' && content[lang].buttonText.length > 0;
      if (!used.has(v.name) && !byButton) missing.add(v.name);
    }
  }
  return [...missing];
}

/** Notification text is shown as plain text everywhere (bell, SMS later), so markup is refused rather than shown as characters. */
export function hasMarkup(kind: TemplateKind, content: TemplateContent): boolean {
  return kind === 'notification' && (['ar', 'en'] as const).some((l) => TEXT_FIELDS.some((f) => /[<>]/.test(content[l][f])));
}

export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Replaces `{{name}}` with the value; a name with no value stays empty. For HTML, escape the values first (`escapeHtml`). */
export function fill(text: string, values: TemplateValues): string {
  return text.replace(VARIABLE_PATTERN, (_, name: string) => values[name] ?? '');
}

/** A subject, a title or a button label is one line: a line break in it would be a header injection in an e-mail. */
export const oneLine = (text: string): string => text.replace(/[\r\n]+/g, ' ').trim();

/** Same wording, whatever order the database returns the keys in. */
export const isSameContent = (a: TemplateContent, b: TemplateContent): boolean => isDeepStrictEqual(a, b);

/** The formatting an e-mail body may keep: no script, style, image or event attribute can pass. */
export function sanitizeEmailBody(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'h3'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }) },
  });
}

/** A plain-text version of formatted text, for the text part of an e-mail and for notifications made from an e-mail body. */
export function htmlToText(html: string): string {
  const spaced = html.replace(/<\/(p|li|h3)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<li>/gi, '• ');
  return sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} }).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
}

const DARK = new Set<BrandColor>(['ink', 'petrol', 'orange']);

/** Readable text on a brand color: cream on the dark ones, ink on the light ones. */
export function onColor(color: BrandColor): string {
  return DARK.has(color) ? BRAND_COLORS.cream : BRAND_COLORS.ink;
}

export const isDarkColor = (color: BrandColor): boolean => DARK.has(color);
