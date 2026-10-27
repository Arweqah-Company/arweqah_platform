import { describe, expect, it } from 'vitest';
import type { TemplateContent } from '@arweqah-platform/shared';
import type { TemplateDefinition } from '../types/template.types';
import { escapeHtml, fill, hasMarkup, htmlToText, isSameContent, oneLine, missingVariables, sanitizeEmailBody, unknownVariables, variablesIn } from './template-rules';

const part = (over: Partial<TemplateContent['ar']> = {}) => ({ title: 'Hello {{name}}', preheader: '', buttonText: '', body: '<p>Hi {{name}}</p>', ...over });
const content = (ar = part(), en = part()): TemplateContent => ({ ar, en });
const def: TemplateDefinition = {
  key: 'auth.invitation', kind: 'email', area: 'sign_in', nameAr: 'a', nameEn: 'a', descriptionAr: 'a', descriptionEn: 'a', defaults: content(),
  variables: [
    { name: 'name', descriptionAr: 'a', descriptionEn: 'a', exampleAr: 'a', exampleEn: 'a' },
    { name: 'link', descriptionAr: 'a', descriptionEn: 'a', exampleAr: 'a', exampleEn: 'a', required: true },
  ],
};

describe('message template rules (FR-64, FR-65)', () => {
  it('finds each variable once', () => {
    expect(variablesIn('{{name}} and {{name}} and {{ticketNumber}} and {{ not }}')).toEqual(['name', 'ticketNumber']);
  });

  it('names the variables the code cannot fill', () => {
    expect(unknownVariables(def, content(part({ body: '<p>{{name}} {{secret}}</p>' })))).toEqual(['secret']);
  });

  it('requires the link in both languages, and the button label stands for it', () => {
    expect(missingVariables(def, content())).toEqual(['link']);
    expect(missingVariables(def, content(part({ buttonText: 'Open' }), part({ buttonText: 'Open' })))).toEqual([]);
    expect(missingVariables(def, content(part({ buttonText: 'Open' }), part({ body: '<p>{{link}}</p>' })))).toEqual([]);
    expect(missingVariables(def, content(part({ buttonText: 'Open' }), part()))).toEqual(['link']);
  });

  it('fills values, escaping them for HTML', () => {
    expect(fill('Hi {{name}}', { name: 'Sara' })).toBe('Hi Sara');
    expect(fill('<p>{{name}}</p>', { name: escapeHtml('<img src=x onerror=alert(1)>') })).toBe('<p>&#60;img src=x onerror=alert(1)&#62;</p>');
    expect(fill('{{missing}}!', {})).toBe('!');
  });

  it('removes scripts, styles, images, events and unsafe links from an e-mail body', () => {
    const out = sanitizeEmailBody('<p onclick="x()">Hi <strong>you</strong></p><script>alert(1)</script><img src=x><a href="javascript:alert(1)">bad</a><a href="https://arweqah.sa">good</a>');
    expect(out).not.toMatch(/script|onclick|<img|javascript:/);
    expect(out).toContain('<strong>you</strong>');
    expect(out).toContain('href="https://arweqah.sa"');
  });

  it('keeps a variable written inside the text', () => {
    expect(sanitizeEmailBody('<p>Hello {{name}}</p>')).toBe('<p>Hello {{name}}</p>');
  });

  it('makes plain text from formatted text, decoding each entity once', () => {
    expect(htmlToText('<p>One &amp; two</p><ul><li>a</li><li>b</li></ul>')).toBe('One & two\n• a\n• b');
    expect(htmlToText('<p>&amp;lt;b&amp;gt;</p>')).toBe('&lt;b&gt;');
  });

  it('keeps a title on one line and compares wording', () => {
    expect(oneLine('Hi\r\nBcc: x@y.z')).toBe('Hi Bcc: x@y.z');
    expect(isSameContent(content(), content())).toBe(true);
    expect(isSameContent(content(), content(part({ title: 'x' })))).toBe(false);
  });

  it('refuses markup in a notification, not in an e-mail', () => {
    expect(hasMarkup('notification', content(part({ body: 'a <b>b</b>' })))).toBe(true);
    expect(hasMarkup('email', content(part({ body: 'a <b>b</b>' })))).toBe(false);
  });
});
