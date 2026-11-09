const POLL_MS = 100;
/** The element must keep the same place for this many checks in a row: a page still fading in or loading its chunk moves under the bubble. */
const STEADY_CHECKS = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function placeOf(selector: string): string | null {
  const el = document.querySelector(selector);
  if (!el || el.getClientRects().length === 0) return null;
  // The height is left out: a list that fills in with its rows grows under the ring, and waiting for it to stop growing froze the tour for seconds.
  const { top, left, width } = el.getBoundingClientRect();
  return `${Math.round(top)}:${Math.round(left)}:${Math.round(width)}`;
}

/** Waits until the router has really arrived at the page (the old page has the same headings, so an element alone proves nothing). */
export async function waitForPath(route: string, timeoutMs: number): Promise<boolean> {
  const path = route.split(/[?#]/)[0];
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (window.location.pathname === path) return true;
    await sleep(POLL_MS);
  }
  return false;
}

/** Waits for the highlighted element to appear and settle; false when it never does (the step is then skipped, not shown on nothing). */
export async function waitForTarget(selector: string, timeoutMs: number): Promise<boolean> {
  if (selector === 'body') return true;
  const until = Date.now() + timeoutMs;
  let last: string | null = null;
  let steady = 0;
  while (Date.now() < until) {
    const place = placeOf(selector);
    steady = place !== null && place === last ? steady + 1 : 0;
    if (steady >= STEADY_CHECKS) return true;
    last = place;
    await sleep(POLL_MS);
  }
  return false;
}

/** Below the `lg` breakpoint the sidebar is a drawer. */
export const isPhoneLayout = (): boolean => !window.matchMedia('(min-width: 1024px)').matches;
