import { afterEach, describe, expect, it } from 'vitest';
import { setLanguage } from '.';

describe('language switching', () => {
  afterEach(() => setLanguage('ar'));

  it('sets the document direction with the language', () => {
    setLanguage('en');
    expect(document.documentElement).toHaveAttribute('dir', 'ltr');
    expect(document.documentElement).toHaveAttribute('lang', 'en');
    setLanguage('ar');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
  });
});
