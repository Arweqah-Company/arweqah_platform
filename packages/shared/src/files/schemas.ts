
/** The default size of an attachment, and the ceiling of what the administrator may set (Settings → Security → Attachments). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_CEILING_BYTES = 100 * 1024 * 1024;
export const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
/** Images, PDF, Word / Excel / PowerPoint files without macros (`.docx`, `.xlsx`, `.pptx`; the macro-enabled types have other MIME types and stay refused) and `.csv` text (checked by name and by being text; never shown inline). */
export const ALLOWED_UPLOAD_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PPTX,
  'text/csv',
] as const;
export type AllowedUploadType = (typeof ALLOWED_UPLOAD_TYPES)[number];

export interface FileDto {
  id: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt: string;
}
