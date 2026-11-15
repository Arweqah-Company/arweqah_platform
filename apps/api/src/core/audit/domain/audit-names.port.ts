import type { AuditText } from '@arweqah-platform/shared';

/** The names behind the ids an audit entry mentions (read-only; an id with no name here is simply missing from the map). */
export abstract class AuditNames {
  abstract namesOf(ids: string[]): Promise<Map<string, AuditText>>;
}
