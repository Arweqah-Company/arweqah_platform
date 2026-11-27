import { describe, expect, it } from 'vitest';
import { cleanModelText, imageMayGoToAi, isReady, windowStart, withinLimit } from './problem-report.rules';

describe('problem report rules (FR-195…FR-199)', () => {
  it('counts the last hour only', () => {
    expect(windowStart(new Date('2026-11-27T10:00:00Z')).toISOString()).toBe('2026-11-27T09:00:00.000Z');
  });

  it('allows a report only below the limit', () => {
    expect(withinLimit(9, 10)).toBe(true);
    expect(withinLimit(10, 10)).toBe(false);
  });

  it('is ready only when on and a type is chosen', () => {
    expect(isReady({ enabled: true, ticketTypeId: 'x' })).toBe(true);
    expect(isReady({ enabled: false, ticketTypeId: 'x' })).toBe(false);
    expect(isReady({ enabled: true, ticketTypeId: null })).toBe(false);
  });

  it('sends the picture to the AI only when the analysis is on and pictures are allowed', () => {
    expect(imageMayGoToAi({ analyzeWithAi: true, sendImageToAi: true })).toBe(true);
    expect(imageMayGoToAi({ analyzeWithAi: true, sendImageToAi: false })).toBe(false);
    expect(imageMayGoToAi({ analyzeWithAi: false, sendImageToAi: true })).toBe(false);
  });

  it('cleans the text of the model: control characters, blank lines, length', () => {
    expect(cleanModelText('a\u0000b\n\n\n\nc', 50)).toBe('ab\n\nc');
    expect(cleanModelText('x'.repeat(30), 10)).toHaveLength(10);
  });
});
