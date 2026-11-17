
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** Images, PDF, Word / Excel files without macros (`.docx`, `.xlsx`; the macro-enabled types have other MIME types and stay refused) and `.csv` text (checked by name and by being text; never shown inline). */
export const ALLOWED_UPLOAD_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
