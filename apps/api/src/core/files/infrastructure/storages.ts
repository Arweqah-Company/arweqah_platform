import { Injectable } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppConfig } from '../../../config/app-config.service';
import { ContentInspector, FileStorage } from '../application/file-storage';

const SIGNED_URL_TTL_SECONDS = 300;

@Injectable()
export class LocalFileStorage extends FileStorage {
  private readonly root: string;

  constructor(config: AppConfig) {
    super();
    this.root = resolve(config.get('LOCAL_STORAGE_DIR'));
  }

  async put(key: string, body: Buffer): Promise<void> {
    const path = this.pathOf(key);
    // Paths come from pathOf(), which confines them to the storage root.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await mkdir(dirname(path), { recursive: true });
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(path, body);
  }

  async read(key: string): Promise<Readable> {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return createReadStream(this.pathOf(key));
  }

  async signedUrl(): Promise<string | null> {
    return null;
  }

  /** Keys are server-generated, but refuse anything escaping the root anyway. */
  private pathOf(key: string): string {
    const path = resolve(this.root, key);
    if (!path.startsWith(this.root + sep)) throw new Error('Invalid storage key');
    return path;
  }
}

@Injectable()
export class S3FileStorage extends FileStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: AppConfig) {
    super();
    this.client = new S3Client({ region: config.get('S3_REGION') });
    this.bucket = config.get('S3_BUCKET') ?? '';
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType, ServerSideEncryption: 'AES256' }),
    );
  }

  async read(key: string): Promise<Readable> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return result.Body as Readable;
  }

  signedUrl(key: string, fileName: string): Promise<string> {
    const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key, ResponseContentDisposition: disposition });
    return getSignedUrl(this.client, command, { expiresIn: SIGNED_URL_TTL_SECONDS });
  }
}

@Injectable()
export class MagicBytesInspector extends ContentInspector {
  async detectType(body: Buffer): Promise<string | null> {
    const { fileTypeFromBuffer } = await import('file-type');
    return (await fileTypeFromBuffer(body))?.mime ?? null;
  }
}
