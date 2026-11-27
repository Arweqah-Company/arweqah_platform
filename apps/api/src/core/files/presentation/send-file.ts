import type { Response } from 'express';
import type { Readable } from 'node:stream';
import type { StoredFile } from '../domain/stored-file.entity';

/** Sends the stream as the answer; when the file cannot be read (it was removed from the storage, a read failed) the answer ends with an error instead of staying open, and the server is not brought down by an unhandled stream error. */
function pipeToResponse(res: Response, stream: Readable): void {
  stream.on('error', () => {
    if (res.headersSent) res.destroy();
    else res.status(500).end();
  });
  stream.pipe(res);
}

/** Answers a download for a feature that already decided the caller may have the file: a redirect to its signed link, or the stream as an attachment. */
export function sendOpenedFile(res: Response, file: StoredFile, opened: { url: string } | { stream: Readable }): void {
  if ('url' in opened) return res.redirect(opened.url);
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
  pipeToResponse(res, opened.stream);
}

/** The bytes of a previewable file (see `FilesService.preview`) shown by the screen itself: inline, never cached or sniffed. */
export function sendPreviewStream(res: Response, file: StoredFile, stream: Readable): void {
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
  res.setHeader('Cache-Control', 'private, no-store');
  pipeToResponse(res, stream);
}
