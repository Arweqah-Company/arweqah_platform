
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;
export type AllowedUploadType = (typeof ALLOWED_UPLOAD_TYPES)[number];

export interface FileDto {
  id: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt: string;
}
