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

/** A picture of what the window shows now, drawn from the page itself (no permission to ask for); approximate: fonts or pictures from elsewhere may differ. Null when the browser cannot draw it. */
export async function captureScreenshot(): Promise<Blob | null> {
  try {
    const background = getComputedStyle(document.body).backgroundColor;
    const dataUrl = await toJpeg(document.body, {
      quality: QUALITY,
      pixelRatio: 1,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: background,
      filter: (node) => !isPrivate(node),
    });
    return dataUrlToBlob(dataUrl);
  } catch {
    return null;
  }
}
