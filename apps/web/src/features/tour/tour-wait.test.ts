import { afterEach, describe, expect, it } from 'vitest';
import { waitForTarget } from './tour-wait';

let el: HTMLElement | null = null;
afterEach(() => { el?.remove(); el = null; });

/** An element whose box is the given one on every look; `grow` makes its height different each time (a list filling in with rows). */
function place(box: { top: number; left: number; width: number }, grow = false): void {
  el = document.createElement('div');
  el.setAttribute('data-tour', 'main-list');
  let height = 100;
  el.getClientRects = () => [{}] as unknown as DOMRectList;
  el.getBoundingClientRect = () => ({ ...box, height: (height += grow ? 40 : 0), x: box.left, y: box.top, right: box.left + box.width, bottom: box.top + height, toJSON: () => ({}) }) as DOMRect;
  document.body.append(el);
}

describe('Waiting for the element of a tour step (FR-67)', () => {
  it('does not wait for a list to stop growing: the ring needs its place, not its final height', async () => {
    place({ top: 120, left: 24, width: 900 }, true);
    const started = Date.now();
    expect(await waitForTarget('[data-tour="main-list"]', 3000)).toBe(true);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('says no when the element never shows, after the time it was given (the step is left out)', async () => {
    const started = Date.now();
    expect(await waitForTarget('[data-tour="nowhere"]', 400)).toBe(false);
    expect(Date.now() - started).toBeGreaterThanOrEqual(350);
  });

  it('waits while the element is still moving into place', async () => {
    place({ top: 0, left: 0, width: 10 });
    let top = 0;
    el!.getBoundingClientRect = () => ({ top: (top += 20), left: 0, width: 10, height: 50 }) as DOMRect;
    expect(await waitForTarget('[data-tour="main-list"]', 600)).toBe(false);
  });

  it('needs no element for «body» (a step in the middle of the screen)', async () => {
    expect(await waitForTarget('body', 100)).toBe(true);
  });
});
