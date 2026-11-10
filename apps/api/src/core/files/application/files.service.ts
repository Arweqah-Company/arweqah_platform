import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, isPreviewable, type FileDto } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../common/domain/domain-error';
import { FileNotPreviewableError, FileTooLargeError, FileTypeNotAllowedError } from '../domain/errors';
import { StoredFile } from '../domain/stored-file.entity';
import { ContentInspector, FileStorage } from './file-storage';
import { FileRepository } from '../domain/file.repository';

export interface IncomingFile {
  buffer: Buffer;
  originalName: string;
  size: number;
}

/** Stricter limits than the default (a profile photo: images only, small). */
export interface UploadRules {
  maxBytes: number;
  types: readonly string[];
}

@Injectable()
export class FilesService {
  constructor(
    private readonly storage: FileStorage,
    private readonly inspector: ContentInspector,
    private readonly repo: FileRepository,
  ) {}

  async upload(ownerId: string, file: IncomingFile, rules: UploadRules = { maxBytes: MAX_UPLOAD_BYTES, types: ALLOWED_UPLOAD_TYPES }): Promise<FileDto> {
    if (file.size > rules.maxBytes) throw new FileTooLargeError();
    const type = await this.inspector.detectType(file.buffer);
    if (!type || !rules.types.includes(type)) throw new FileTypeNotAllowedError();
    const now = new Date();
    const storageKey = `${now.getUTCFullYear()}/${now.getUTCMonth() + 1}/${randomUUID()}`;
    await this.storage.put(storageKey, file.buffer, type);
    const saved = await this.repo.save(
      Object.assign(new StoredFile(), {
        ownerId,
        storageKey,
        originalName: safeName(file.originalName),
        contentType: type,
        size: file.size,
      }),
    );
    return toFileDto(saved);
  }

  /** Foundation rule: only the uploader can read a file. Feature modules grant wider access. */
  async getOwned(id: string, userId: string): Promise<StoredFile> {
    const file = await this.repo.findById(id);
    if (!file || file.ownerId !== userId) throw new NotFoundError('File', id);
    return file;
  }

  /** For a feature that already decided the caller may read this file (e.g. an attachment of a ticket they may see). */
  async getGranted(id: string): Promise<StoredFile> {
    const file = await this.repo.findById(id);
    if (!file) throw new NotFoundError('File', id);
    return file;
  }

  /** The bytes of an image or a PDF for the preview window (never a redirect: the screen reads them itself); other types are refused. */
  async preview(file: StoredFile): Promise<Readable> {
    if (!isPreviewable(file.contentType)) throw new FileNotPreviewableError();
    return this.storage.read(file.storageKey);
  }

  async open(file: StoredFile): Promise<{ url: string } | { stream: Readable }> {
    const url = await this.storage.signedUrl(file.storageKey, file.originalName);
    return url ? { url } : { stream: await this.storage.read(file.storageKey) };
  }
}

/** Keeps a display name only: strips paths and control characters. */
export function safeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file';
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f<>:"|?*]/g, '').trim();
  return (cleaned || 'file').slice(0, 200);
}

export function toFileDto(f: StoredFile): FileDto {
  return { id: f.id, originalName: f.originalName, contentType: f.contentType, size: f.size, createdAt: f.createdAt.toISOString() };
}
