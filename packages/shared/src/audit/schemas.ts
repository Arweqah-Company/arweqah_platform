import { z } from 'zod';
import { paginationQuerySchema } from '../common/pagination';
import { AUDIT_CATEGORIES, type AuditCategory } from './catalog';

export const auditQuerySchema = paginationQuerySchema.extend({
  /** One kind of event: sign-in, employees, tasks… (see the catalog). */
  category: z.enum(AUDIT_CATEGORIES).optional(),
  action: z.string().max(80).optional(),
  actorId: z.uuid().optional(),
  entityType: z.string().max(80).optional(),
  /** Contains-match on the actor's name or e-mail (`search` matches action, record type and record id). */
  actor: z.string().trim().max(100).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

export interface AuditLogDto {
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
