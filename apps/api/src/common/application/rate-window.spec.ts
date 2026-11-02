import { describe, expect, it } from 'vitest';
import { RateWindow } from './rate-window';

describe('RateWindow', () => {
  it('lets a key take its turns within the window and refuses the next, then lets it again when the window has passed', () => {
    const window = new RateWindow(2, 1000);
    expect([window.take('a', 0), window.take('a', 100), window.take('a', 200)]).toEqual([true, true, false]);
    expect(window.take('b', 200)).toBe(true);
    expect(window.take('a', 1001)).toBe(true);
  });

  it('takes the limit of the call when one is given (a setting that changes while running)', () => {
    const window = new RateWindow(1, 1000);
    expect(window.take('a', 0)).toBe(true);
    expect(window.take('a', 1, 1)).toBe(false);
    expect(window.take('a', 2, 5)).toBe(true);
  });

  it('forgets the keys that have no turn left in the window', () => {
    const window = new RateWindow(5, 1000);
    window.take('old', 0);
    window.take('new', 900);
    window.prune(1500);
    expect(window.size).toBe(1);
  });
});
