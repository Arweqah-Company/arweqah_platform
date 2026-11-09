import { describe, expect, it } from 'vitest';
import { positionOf, targetsOf, type Run } from './use-tour-runner';

const run = (index: number, skipped: number[], count = 10): Run => ({ tour: 'general', index, skipped, steps: Array.from({ length: count }, (_, i) => ({ key: `s${i}`, ui: { key: `s${i}`, target: 'body' }, title: '', body: '', can: [] })) });

describe('«3 of 20» counts the steps the person will really see (FR-67)', () => {
  it('counts every step when none was skipped', () => {
    expect(positionOf(run(0, []))).toEqual({ index: 0, total: 10 });
    expect(positionOf(run(4, []))).toEqual({ index: 4, total: 10 });
  });

  it('leaves a step whose element is not on the person\'s screen out of both numbers', () => {
    expect(positionOf(run(5, [2, 3]))).toEqual({ index: 3, total: 8 });
    expect(positionOf(run(9, [2, 3, 7]))).toEqual({ index: 6, total: 7 });
  });

  it('does not count a skipped step that is still ahead as passed', () => {
    expect(positionOf(run(1, [6]))).toEqual({ index: 1, total: 9 });
  });

  it('says nothing when no tour plays', () => {
    expect(positionOf(null)).toEqual({ index: 0, total: 0 });
  });
});

describe('what a step may point at (FR-67)', () => {
  const ui = (target: string) => ({ key: 'k', target });

  it('a page\'s main thing falls back to the page\'s content area, so a board or an empty page still gets its step', () => {
    expect(targetsOf(ui('[data-tour="main-list"]'))).toEqual(['[data-tour="main-list"]', '#main']);
  });

  it('any other element has no fallback: a step about a button that is not there is left out', () => {
    expect(targetsOf(ui('[data-tour="ticket-new"]'))).toEqual(['[data-tour="ticket-new"]']);
  });
});
