import { describe, expect, it } from 'vitest';
import { channelCodeFrom, sameName, writerRoleNames } from './notice-channels.rules';

describe('Notice channel rules (FR-177)', () => {
  it('makes the code from the English name: lower case, letters and digits, one underscore between words', () => {
    expect(channelCodeFrom('Legal Affairs & Compliance', new Set())).toBe('legal_affairs_compliance');
    expect(channelCodeFrom('  IT -- Support 24/7 ', new Set())).toBe('it_support_24_7');
  });

  it('numbers a code that is taken and falls back to «channel» when the name has no letters', () => {
    expect(channelCodeFrom('Legal', new Set(['legal']))).toBe('legal_2');
    expect(channelCodeFrom('Legal', new Set(['legal', 'legal_2']))).toBe('legal_3');
    expect(channelCodeFrom('قناة', new Set())).toBe('channel');
  });

  it('keeps the code inside its column even with a long name', () => {
    expect(channelCodeFrom('a'.repeat(200), new Set()).length).toBeLessThanOrEqual(60);
    expect(channelCodeFrom('a'.repeat(200), new Set(['a'.repeat(56)])).length).toBeLessThanOrEqual(60);
  });

  it('names the writer role from the channel, in both languages', () => {
    expect(writerRoleNames({ nameAr: 'الشؤون القانونية', nameEn: 'Legal' })).toEqual({ nameAr: 'كاتب تعاميم — الشؤون القانونية', nameEn: 'Notice writer — Legal' });
  });

  it('compares channel names without regard to case or surrounding spaces', () => {
    expect(sameName(' Legal ', 'legal')).toBe(true);
    expect(sameName('Legal', 'Legal affairs')).toBe(false);
  });
});
