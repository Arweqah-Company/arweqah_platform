
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** Images, PDF, and Word / Excel files without macros (`.docx`, `.xlsx`; the macro-enabled types have other MIME types and stay refused). */
export const ALLOWED_UPLOAD_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;
export type AllowedUploadType = (typeof ALLOWED_UPLOAD_TYPES)[number];

export interface FileDto {
  id: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt: string;
}
