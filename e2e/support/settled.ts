import type { Page } from '@playwright/test';

/** Waits for the page's finite animations (the fade-in of a page, a dialog opening) so a click lands on a still element. */
export const settled = (page: Page): Promise<unknown> =>
  page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
