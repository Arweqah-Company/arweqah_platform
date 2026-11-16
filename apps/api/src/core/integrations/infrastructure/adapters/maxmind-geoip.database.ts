import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { Injectable, Logger } from '@nestjs/common';
import { Reader, type CityResponse } from 'maxmind';
import type { AuditText } from '@arweqah-platform/shared';
import { AppConfig } from '../../../../config/app-config.service';
import { GeoipDatabase, type GeoipInstall } from '../../domain/contracts/geoip-database';

const run = promisify(execFile);
const URL_OF_DATABASE = 'https://download.maxmind.com/geoip/databases/GeoLite2-City/download?suffix=tar.gz';
const FILE_NAME = 'GeoLite2-City.mmdb';
const DOWNLOAD_TIMEOUT_MS = 120_000;
const MB = 1024 * 1024;

/**
 * MaxMind's free GeoLite2-City file, downloaded with the account number and license key saved in the dashboard (HTTP basic authentication),
 * unpacked with the system `tar` (fixed arguments, no shell) into the storage folder, opened only after it checks out, and read from memory.
 */
@Injectable()
export class MaxmindGeoipDatabase extends GeoipDatabase {
  private readonly logger = new Logger(MaxmindGeoipDatabase.name);
  private reader: Reader<CityResponse> | null | undefined;
  private opening: Promise<Reader<CityResponse> | null> | undefined;

  constructor(private readonly config: AppConfig) {
    super();
  }

  async install(accountId: string, licenseKey: string): Promise<GeoipInstall> {
    let work: string | undefined;
    try {
      await mkdir(this.folder(), { recursive: true });
      work = await mkdtemp(join(this.folder(), '..', 'geoip-work-'));
      const archive = await this.download(accountId, licenseKey);
      if (typeof archive === 'string') return { ok: false, message: archive };
      await writeFile(join(work, 'db.tar.gz'), archive);
      await run('tar', ['-xzf', join(work, 'db.tar.gz'), '-C', work]);
      const file = await this.findDatabase(work);
      if (!file) return { ok: false, message: 'The download did not contain the city database' };
      const bytes = await readFile(file);
      this.reader = new Reader<CityResponse>(bytes);
      await rename(file, join(this.folder(), FILE_NAME));
      return { ok: true, sizeMb: Math.round((bytes.length / MB) * 10) / 10 };
    } catch (error) {
      this.logger.warn(`Installing the city database failed: ${(error as Error).message}`);
      return { ok: false, message: 'The downloaded file could not be opened as a city database' };
    } finally {
      if (work) await rm(work, { recursive: true, force: true });
    }
  }

  async lookup(ip: string): Promise<AuditText | null> {
    const reader = await this.open();
    try {
      const name = reader?.get(ip)?.city?.names.en;
      return name ? { ar: name, en: name } : null; // GeoLite2 names cities in English only
    } catch {
      return null;
    }
  }

  private folder(): string {
    return join(this.config.get('LOCAL_STORAGE_DIR'), 'geoip');
  }

  private async open(): Promise<Reader<CityResponse> | null> {
    if (this.reader !== undefined) return this.reader;
    this.opening ??= this.load(); // concurrent lookups share one read of the file
    return this.opening;
  }

  private async load(): Promise<Reader<CityResponse> | null> {
    try {
      this.reader = new Reader<CityResponse>(await readFile(join(this.folder(), FILE_NAME)));
    } catch {
      this.reader = null;
    }
    this.opening = undefined;
    return this.reader;
  }

  /** The archive, or the reason (a text) it could not be fetched. */
  private async download(accountId: string, licenseKey: string): Promise<Buffer | string> {
    const auth = Buffer.from(`${accountId}:${licenseKey}`).toString('base64');
    const response = await fetch(URL_OF_DATABASE, { headers: { Authorization: `Basic ${auth}` }, signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) }).catch(() => null);
    if (!response) return 'MaxMind did not answer in time';
    if (response.status === 401) return 'MaxMind rejected the account number or the license key';
    if (!response.ok) return `MaxMind answered with status ${response.status}`;
    return Buffer.from(await response.arrayBuffer());
  }

  private async findDatabase(root: string): Promise<string | null> {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const inner = await readdir(join(root, entry.name));
        if (inner.includes(FILE_NAME)) return join(root, entry.name, FILE_NAME);
      }
    }
    return null;
  }
}
