import type { Readable } from 'node:stream';

/** Strategy: private S3 bucket in production, local folder in development and tests. */
export abstract class FileStorage {
  abstract put(key: string, body: Buffer, contentType: string): Promise<void>;
  abstract read(key: string): Promise<Readable>;
  /** Short-lived URL when the backend supports it (S3); null means stream through the API. */
  abstract signedUrl(key: string, fileName: string): Promise<string | null>;
}

/** Detects the real type from the file's bytes, not from its name or the client's header. */
export abstract class ContentInspector {
  abstract detectType(body: Buffer): Promise<string | null>;
}
