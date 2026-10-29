import { describe, expect, it } from 'vitest';
import { defaultOrder, isCompleteOrder, sortedSteps, storedOrder } from './tour-steps.rules';

describe('tour step rules', () => {
  it('keeps the code order when nothing was reordered', () => {
    const keys = sortedSteps('general', new Map()).map((s) => s.key);
    expect(keys[0]).toBe('welcome');
    expect(keys.at(-1)).toBe('finish');
  });

  it('puts a step where the administrator moved it', () => {
    const saved = new Map([['finish', 5]]);
    expect(sortedSteps('general', saved)[0]!.key).toBe('finish');
  });

  it('breaks a tie with the code order', () => {
    const saved = new Map<string, number | null>([['home', defaultOrder('general', 'sidebar')]]);
    const keys = sortedSteps('general', saved).map((s) => s.key);
    expect(keys.indexOf('sidebar')).toBeLessThan(keys.indexOf('home'));
  });

  it('accepts an order only with every step of the tour exactly once', () => {
    const all = sortedSteps('admin', new Map()).map((s) => s.key as string);
    expect(isCompleteOrder('admin', all)).toBe(true);
    expect(isCompleteOrder('admin', all.slice(1))).toBe(false);
    expect(isCompleteOrder('admin', [...all.slice(1), all[1]!])).toBe(false);
    expect(isCompleteOrder('admin', [...all.slice(1), 'welcome'])).toBe(false);
  });

  it('leaves gaps between stored positions', () => {
    expect(storedOrder(0)).toBe(10);
    expect(storedOrder(2)).toBe(30);
  });
});
