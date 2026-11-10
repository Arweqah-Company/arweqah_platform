const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** How the screen shows a file in its own window: an image, a PDF (the browser's viewer), or a Word / Excel file drawn by the page itself (approximately). */
export type PreviewKind = 'image' | 'pdf' | 'docx' | 'xlsx';

const KINDS: Record<string, PreviewKind> = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'application/pdf': 'pdf',
  [DOCX]: 'docx',
  [XLSX]: 'xlsx',
};

/** The file types the screen may show in its own window; everything else offers a download only. Never SVG or HTML (they can carry script). */
export const PREVIEW_CONTENT_TYPES = Object.keys(KINDS);

export const previewKindOf = (contentType: string): PreviewKind | null => KINDS[contentType.toLowerCase().split(';')[0]?.trim() ?? ''] ?? null;

export const isPreviewable = (contentType: string): boolean => previewKindOf(contentType) !== null;
