/** The file types a title file can be read from: a text file, a Word document or a PDF (read in the browser; the server only receives the text). */
export const TITLE_FILE_ACCEPT = '.txt,.docx,.pdf';
export const TITLE_FILE_MAX_BYTES = 10 * 1024 * 1024;

export class DocumentReadError extends Error {
  constructor(readonly reason: 'unsupported' | 'unreadable' | 'empty') {
    super(reason);
  }
}

const extensionOf = (name: string): string => /\.([^.]+)$/.exec(name.toLowerCase())?.[1] ?? '';

/** The text of a `.txt`, `.docx` or `.pdf` file, one line per paragraph; the readers load only when that type is chosen. */
export async function readDocumentText(file: File): Promise<string> {
  const kind = extensionOf(file.name);
  let text: string;
  try {
    if (kind === 'txt') text = await file.text();
    else if (kind === 'docx') text = await readDocx(file);
    else if (kind === 'pdf') text = await readPdf(file);
    else throw new DocumentReadError('unsupported');
  } catch (error) {
    throw error instanceof DocumentReadError ? error : new DocumentReadError('unreadable');
  }
  if (!text.trim()) throw new DocumentReadError('empty');
  return text;
}

async function readDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth/mammoth.browser');
  return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
}

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) pages.push(linesOf((await (await pdf.getPage(n)).getTextContent()).items));
  return pages.join('\n');
}

/** A PDF page gives pieces of text with their height on the page: the pieces on one height are one line, in reading order. */
export function linesOf(items: readonly unknown[]): string {
  const pieces = items.filter((i): i is { str: string; transform: number[]; hasEOL?: boolean } => !!i && typeof (i as { str?: unknown }).str === 'string');
  const lines: string[] = [];
  let current = '';
  for (const piece of pieces) {
    current += piece.str;
    if (piece.hasEOL) {
      lines.push(current);
      current = '';
    }
  }
  if (current) lines.push(current);
  return lines.map((l) => l.trim()).filter(Boolean).join('\n');
}
