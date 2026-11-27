import DOMPurify from 'dompurify';
import { cellToText } from '../data-exchange/cells';
import { parseCsv } from '../data-exchange/csv';

/** A large workbook never fills the window: the first rows and columns of each sheet are drawn, and the screen says so. */
export const PREVIEW_MAX_ROWS = 200;
export const PREVIEW_MAX_COLUMNS = 30;

export interface PreviewSheet {
  name: string;
  rows: string[][];
  /** True when rows or columns were left out. */
  truncated: boolean;
}

let hooked = false;

/** Links of a document open in a new tab and carry no referrer (set once, on the sanitizer). */
function sanitizer(): typeof DOMPurify {
  if (!hooked) {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow');
      }
    });
    hooked = true;
  }
  return DOMPurify;
}

/** A Word document as a safe piece of page (a DOM fragment, never an HTML string): headings, paragraphs, lists, tables and embedded pictures; scripts, styles, forms and unknown links are removed. */
export async function docxToFragment(blob: Blob): Promise<DocumentFragment> {
  const mammoth = await import('mammoth/mammoth.browser');
  const { value } = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
  return sanitizer().sanitize(value, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe', 'object', 'embed'], RETURN_DOM_FRAGMENT: true });
}

/** Every sheet of an Excel file as plain text cells (never run: a cell is only ever shown as text). */
export async function xlsxToSheets(blob: Blob): Promise<PreviewSheet[]> {
  const { default: readXlsxFile } = await import('read-excel-file/universal');
  const sheets = await readXlsxFile(blob);
  return sheets.map(({ sheet, data }) => {
    const rows = data.slice(0, PREVIEW_MAX_ROWS).map((row) => row.slice(0, PREVIEW_MAX_COLUMNS).map(cellToText));
    const wide = data.some((row) => row.length > PREVIEW_MAX_COLUMNS);
    return { name: sheet, rows, truncated: data.length > PREVIEW_MAX_ROWS || wide };
  });
}

/** The text of a CSV in the encoding Excel saved it: UTF-16 (byte order mark), UTF-8, or the Windows-1256 «ANSI» Arabic that is not valid UTF-8. */
export function decodeCsv(bytes: ArrayBuffer): string {
  const head = new Uint8Array(bytes.slice(0, 2));
  if (head[0] === 0xff && head[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (head[0] === 0xfe && head[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1256').decode(bytes);
  }
}

/** A CSV as one sheet of plain text cells (never run), with the same limits as a workbook. */
export async function csvToSheets(blob: Blob): Promise<PreviewSheet[]> {
  const data = parseCsv(decodeCsv(await blob.arrayBuffer())).filter((row) => row.some((cell) => cell.trim() !== ''));
  const rows = data.slice(0, PREVIEW_MAX_ROWS).map((row) => row.slice(0, PREVIEW_MAX_COLUMNS).map((cell) => cell.trim()));
  return [{ name: 'CSV', rows, truncated: data.length > PREVIEW_MAX_ROWS || data.some((row) => row.length > PREVIEW_MAX_COLUMNS) }];
}

/** A big deck never fills the window: the first slides are drawn, each with a few pictures, and the screen says so. */
export const PREVIEW_MAX_SLIDES = 100;
export const PREVIEW_MAX_SLIDE_IMAGES = 4;
const PREVIEW_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const IMAGE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

export interface PreviewSlide {
  number: number;
  /** The text of the slide, one entry per paragraph, the title first. */
  lines: string[];
  images: Blob[];
  /** True when the slide had more pictures than are shown. */
  moreImages: boolean;
}

export interface PreviewDeck {
  slides: PreviewSlide[];
  /** True when slides were left out. */
  truncated: boolean;
}

/** The paragraphs of a slide as plain text (the XML is read as data, never run or put in the page as markup). */
function slideLines(xml: string): string[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return Array.from(doc.getElementsByTagNameNS(DRAWING_NS, 'p'))
    .map((p) => Array.from(p.getElementsByTagNameNS(DRAWING_NS, 't')).map((t) => t.textContent ?? '').join('').trim())
    .filter(Boolean);
}

/** `ppt/slides/../media/a.png` → `ppt/media/a.png`. */
function resolveTarget(base: string, target: string): string {
  const parts = base.split('/').slice(0, -1);
  for (const part of target.split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.') parts.push(part);
  }
  return parts.join('/');
}

type Zip = Awaited<ReturnType<(typeof import('jszip'))['loadAsync']>>;

/** The pictures of a slide (png, jpg, gif, webp only: never SVG, which can carry script), as blobs. */
async function slideImages(zip: Zip, slidePath: string): Promise<{ images: Blob[]; more: boolean }> {
  const rels = zip.file(slidePath.replace('slides/', 'slides/_rels/') + '.rels');
  if (!rels) return { images: [], more: false };
  const doc = new DOMParser().parseFromString(await rels.async('string'), 'application/xml');
  const targets = Array.from(doc.getElementsByTagName('Relationship'))
    .filter((r) => r.getAttribute('Type')?.endsWith('/image'))
    .map((r) => resolveTarget(slidePath, r.getAttribute('Target') ?? ''))
    .filter((path) => IMAGE_TYPES[path.split('.').pop()?.toLowerCase() ?? '']);
  const images: Blob[] = [];
  for (const path of targets.slice(0, PREVIEW_MAX_SLIDE_IMAGES)) {
    const bytes = await zip.file(path)?.async('uint8array');
    if (bytes && bytes.byteLength <= PREVIEW_MAX_IMAGE_BYTES) images.push(new Blob([bytes as BlobPart], { type: IMAGE_TYPES[path.split('.').pop()?.toLowerCase() ?? ''] }));
  }
  return { images, more: targets.length > PREVIEW_MAX_SLIDE_IMAGES };
}

/** The slide files in the order the presentation shows them (`p:sldIdLst` and its relationships), or by file number when the presentation does not say. */
async function slideOrder(zip: Zip): Promise<string[]> {
  const byNumber = Object.keys(zip.files)
    .map((name) => ({ name, number: Number(/^ppt\/slides\/slide(\d+)\.xml$/.exec(name)?.[1]) }))
    .filter((s) => Number.isInteger(s.number))
    .sort((a, b) => a.number - b.number)
    .map((s) => s.name);
  const presentation = await zip.file('ppt/presentation.xml')?.async('string');
  const rels = await zip.file('ppt/_rels/presentation.xml.rels')?.async('string');
  if (!presentation || !rels) return byNumber;
  const parse = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml');
  const target = new Map(Array.from(parse(rels).getElementsByTagName('Relationship')).map((r) => [r.getAttribute('Id') ?? '', resolveTarget('ppt/presentation.xml', r.getAttribute('Target') ?? '')]));
  const listed = Array.from(parse(presentation).getElementsByTagName('p:sldId'))
    .map((el) => target.get(el.getAttribute('r:id') ?? ''))
    .filter((path): path is string => !!path && zip.file(path) !== null);
  return listed.length ? listed : byNumber;
}

/** A PowerPoint file as slides of text and pictures (an approximation: no layout, shapes or animations), read in the browser. */
export async function pptxToSlides(blob: Blob): Promise<PreviewDeck> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const paths = await slideOrder(zip);
  const slides: PreviewSlide[] = [];
  for (const [index, name] of paths.slice(0, PREVIEW_MAX_SLIDES).entries()) {
    const { images, more } = await slideImages(zip, name);
    const xml = (await zip.file(name)?.async('string')) ?? '';
    slides.push({ number: index + 1, lines: slideLines(xml), images, moreImages: more });
  }
  return { slides, truncated: paths.length > PREVIEW_MAX_SLIDES };
}
