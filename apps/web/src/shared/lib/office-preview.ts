import DOMPurify from 'dompurify';
import { cellToText } from '../data-exchange/cells';

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
