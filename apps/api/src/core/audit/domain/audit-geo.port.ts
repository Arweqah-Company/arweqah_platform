import type { AuditText } from '@arweqah-platform/shared';

/** The city of an address, in Arabic and English, or null (private address, unknown address, or the service is off). */
export abstract class AuditGeo {
  abstract cityOf(ip: string | null): Promise<AuditText | null>;
}
