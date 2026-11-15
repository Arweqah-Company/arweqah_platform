import type { AuditText } from '@arweqah-platform/shared';

/** The outcome of fetching and installing the city database. */
export type GeoipInstall = { ok: true; sizeMb: number } | { ok: false; message: string };

/**
 * The city database the platform looks addresses up in. It is downloaded from the provider with the data saved in the dashboard (never at
 * request time) and kept on the server, so no address of an employee leaves it.
 */
export abstract class GeoipDatabase {
  /** Downloads the database with these credentials, checks it opens, and replaces the installed one. */
  abstract install(accountId: string, licenseKey: string): Promise<GeoipInstall>;
  /** The city of an address (English and Arabic names), or null: no database installed, a private address, or an unknown one. */
  abstract lookup(ip: string): Promise<AuditText | null>;
}
