import { describe, expect, it } from 'vitest';
import { excerptOf, hasText, plainText, sanitizeNoticeBody } from './notice-content.rules';

describe('The text of a notice (FR-167)', () => {
  it('keeps the formatting a notice may have and drops script, style, images, frames and event attributes', () => {
    expect(sanitizeNoticeBody('<h2>Title</h2><p>a <b>b</b> <a href="https://x.sa" onclick="x()">link</a></p><script>alert(1)</script><img src=x onerror=y><iframe src="https://evil"></iframe><style>p{}</style>')).toBe(
      '<h2>Title</h2><p>a <b>b</b> <a href="https://x.sa" rel="noopener noreferrer" target="_blank">link</a></p>',
    );
  });

  it('refuses a script link', () => {
    expect(sanitizeNoticeBody('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript');
  });

  it('reads the plain text and cuts a long excerpt', () => {
    expect(plainText('<p>one <strong>two</strong></p>\n<p>three</p>')).toBe('one two three');
    expect(excerptOf('<p>short</p>')).toBe('short');
    expect(excerptOf(`<p>${'x'.repeat(300)}</p>`)).toHaveLength(201);
    expect(hasText('<p><br></p>')).toBe(false);
    expect(hasText('<p>x</p>')).toBe(true);
  });
});
