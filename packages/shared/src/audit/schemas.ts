import { z } from 'zod';
import { paginationQuerySchema } from '../common/pagination';
import { AUDIT_CATEGORIES, type AuditCategory } from './catalog';
import type { AuditDetailDto, AuditText } from './readable';

export const auditQuerySchema = paginationQuerySchema.extend({
  /** One kind of event: sign-in, employees, tasks… (see the catalog). */
  category: z.enum(AUDIT_CATEGORIES).optional(),
  action: z.string().max(80).optional(),
  actorId: z.uuid().optional(),
  entityType: z.string().max(80).optional(),
  /** One record of that type (the history tab of an employee). */
  entityId: z.string().max(100).optional(),
  /** Contains-match on the actor's name or e-mail (`search` matches action, record type and record id). */
  actor: z.string().trim().max(100).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

/** What the log table holds for one entry. */
export interface AuditEntryDto {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  category: AuditCategory;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

/** An entry as the screens read it: the same, plus the record's name and the changes in words. */
export interface AuditLogDto extends AuditEntryDto {
  /** The record the entry is about, by name (an employee, a role, a ticket number…), when it still exists. */
  entityName: AuditText | null;
  /** `changes` read by a person: a label for every key and a name for every id (null when the entry has no changes). */
  details: AuditDetailDto[] | null;
  /** The city the address belongs to (null when the server has no city database, or the address is private or unknown). */
  ipCity: AuditText | null;
}
