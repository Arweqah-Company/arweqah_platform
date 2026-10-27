import { describe, expect, it } from 'vitest';
import { fromEditorHtml, toEditorHtml } from './editor-tokens';

const labels = { name: 'Recipient name', link: 'Link' };

describe('template editor text (FR-64, FR-65)', () => {
  it('shows a known variable as a chip and keeps an unknown one as text', () => {
    const html = toEditorHtml('<p>Hello {{name}} {{nope}}</p>', labels, 'rich');
    expect(html).toContain('data-id="name"');
    expect(html).toContain('{{nope}}');
  });

  it('turns chips back into {{variables}}', () => {
    const html = toEditorHtml('<p>Hello {{name}}, open {{link}}</p>', labels, 'rich');
    expect(fromEditorHtml(html, 'rich')).toBe('<p>Hello {{name}}, open {{link}}</p>');
  });

  it('keeps a notification as plain lines and never lets markup in', () => {
    const html = toEditorHtml('First {{name}}\nSecond <b>x</b> & more', labels, 'plain');
    expect(html.match(/<p>/g)).toHaveLength(2);
    expect(html).not.toContain('<b>');
    expect(fromEditorHtml(html, 'plain')).toBe('First {{name}}\nSecond <b>x</b> & more');
  });

  it('decodes what was typed once: a typed entity stays as typed, a non-breaking space is a space', () => {
    expect(fromEditorHtml('<p>a &amp;lt; b&nbsp;c &amp; d</p>', 'plain')).toBe('a &lt; b c & d');
  });

  it('keeps a title on one line', () => {
    expect(fromEditorHtml('<p>One {{name}}</p><p>Two</p>', 'line')).toBe('One {{name}}');
  });
});
