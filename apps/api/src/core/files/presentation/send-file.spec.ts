import { PassThrough } from 'node:stream';
import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { StoredFile } from '../domain/stored-file.entity';
import { sendOpenedFile, sendPreviewStream } from './send-file';

const FILE = { contentType: 'image/png', originalName: 'a.png' } as StoredFile;

/** A response that is a writable stream, with the few Express methods the helper uses. */
function response() {
  const res = Object.assign(new PassThrough(), { headersSent: false, setHeader: vi.fn(), status: vi.fn(), destroy: vi.fn(), end: vi.fn() });
  res.status.mockReturnValue(res);
  return res as unknown as Response & { status: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
}

describe('Sending a stored file (FR-191)', () => {
  it.each([
    ['preview', (res: Response, s: PassThrough) => sendPreviewStream(res, FILE, s)],
    ['download', (res: Response, s: PassThrough) => sendOpenedFile(res, FILE, { stream: s })],
  ])('ends the answer when the file cannot be read (%s), instead of leaving the request open or crashing the server', (_name, send) => {
    const res = response();
    const source = new PassThrough();
    send(res, source);
    expect(() => source.emit('error', new Error('ENOENT'))).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.end).toHaveBeenCalled();
  });
});
