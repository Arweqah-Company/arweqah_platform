import { toJpeg } from 'html-to-image';

const QUALITY = 0.85;

/** Nodes that never go into a screenshot: password fields and anything marked `data-private`. */
export function isPrivate(node: Node): boolean {
  return node instanceof HTMLElement && (node.dataset.private !== undefined || (node instanceof HTMLInputElement && node.type === 'password'));
}

/** The bytes of a `data:` URL, read without a network call (the page's own rules allow no `data:` fetch). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body = ''] = dataUrl.split(',');
  const type = /data:([^;]+)/.exec(head ?? '')?.[1] ?? 'image/jpeg';
  const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type });
}

/** The first background colour that is not transparent (a JPEG has no transparency: a see-through page would come out black). */
function pageBackground(): string {
  const candidates = [document.body, document.documentElement].map((el) => getComputedStyle(el).backgroundColor);
  return candidates.find((c) => c !== '' && c !== 'transparent' && !c.endsWith(', 0)')) ?? 'white';
}

/** A 1×1 transparent picture put where an image cannot be fetched (so one broken avatar never spoils the whole screenshot). */
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/** Where the picture starts: the page is drawn from its top, so it is moved up and left by what the person scrolled, and the window-sized picture shows what they were looking at. */
export function viewportStyle(scrollX: number, scrollY: number): Record<string, string> {
  return { transform: `translate(${-scrollX}px, ${-scrollY}px)`, transformOrigin: 'top left' };
}

/** A picture of what the window shows now, drawn from the page itself (no permission to ask for); approximate: fonts or pictures from elsewhere may differ. Null when the browser cannot draw it. */
export async function captureScreenshot(): Promise<Blob | null> {
  try {
    const dataUrl = await renderWithFallback();
    return dataUrlToBlob(dataUrl);
  } catch (failure) {
    console.warn('The screenshot could not be taken', failure);
    return null;
  }
}

/** Pictures that need the session (employee photos) are fetched with it; when drawing fails with the page's fonts it is tried once more without them. */
async function renderWithFallback(): Promise<string> {
  const options = { quality: QUALITY, pixelRatio: 1, width: window.innerWidth, height: window.innerHeight, backgroundColor: pageBackground(), imagePlaceholder: BLANK, fetchRequestInit: { credentials: 'include' as const }, style: viewportStyle(window.scrollX, window.scrollY), filter: (node: Node) => !isPrivate(node) };
  try {
    return await toJpeg(document.body, options);
  } catch (failure) {
    console.warn('The screenshot failed with the fonts; trying without them', failure);
    return toJpeg(document.body, { ...options, skipFonts: true });
  }
}
