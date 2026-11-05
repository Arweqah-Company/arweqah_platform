import type { OrgChangeLogLineDto, OrgNodeVersionDto } from '@arweqah-platform/shared';
import type { AuditLogDto } from '@arweqah-platform/shared';
import { versionStatus } from '../../domain/rules/org-version.rules';
import type { VersionView } from '../../domain/types/org-version.types';
import type { NodeView } from '../../domain/types/org.types';

export const toVersionDto = (v: VersionView, today: string, createdByName: string | null): OrgNodeVersionDto => ({
  id: v.id,
  validFrom: v.validFrom,
  validTo: v.validTo,
  status: versionStatus(v, today),
  nameAr: v.nameAr,
  nameEn: v.nameEn,
  code: v.code,
  isActive: v.isActive,
  charter: v.charter,
  reason: v.reason,
  createdByName,
  createdAt: v.createdAt.toISOString(),
});

/** A unit that has no stored version yet shows its own values as the one in force. */
export const nodeAsVersionDto = (n: NodeView, today: string): OrgNodeVersionDto => ({
  id: null,
  validFrom: n.startDate < today ? n.startDate : today,
  validTo: null,
  status: 'current',
  nameAr: n.nameAr,
  nameEn: n.nameEn,
  code: n.code,
  isActive: n.isActive,
  charter: n.charter,
  reason: '',
  createdByName: null,
  createdAt: null,
});

export const toLogLineDto = (e: AuditLogDto): OrgChangeLogLineDto => ({
  id: e.id,
  action: e.action,
  actorName: e.actorName,
  reason: typeof e.changes?.reason === 'string' ? e.changes.reason : null,
  createdAt: e.createdAt,
});
