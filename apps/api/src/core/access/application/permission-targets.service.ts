import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { widestScope, type PermissionGrant, type PermissionTargetDto, type PermissionTargetKind } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import type { AccessContext } from '../domain/access-context';
import { PermissionTargetRepository, type TargetRef } from '../domain/permission-target.repository';
import { ACCESS_CHANGED } from './access.events';
import { PermissionCatalog } from './permission-catalog';
import { UserAccessService } from './user-access.service';

/** Where does an administrator place permissions? On a role, a group of roles, one person or a group of people: one page for all four. */
@Injectable()
export class PermissionTargetsService {
  constructor(
    private readonly targets: PermissionTargetRepository,
    private readonly catalog: PermissionCatalog,
    private readonly access: UserAccessService,
    private readonly events: EventEmitter2,
  ) {}

  list(kind: PermissionTargetKind, search?: string): Promise<TargetRef[]> {
    return this.targets.list(kind, search);
  }

  async get(kind: PermissionTargetKind, id: string): Promise<PermissionTargetDto> {
    const target = await this.mustFind(kind, id);
    const [permissions, inherited] = await Promise.all([this.targets.direct(kind, id), this.targets.inherited(kind, id)]);
    return { kind, ...target, permissions, inherited: this.merged(inherited) };
  }

  /** Nobody places more than they hold (same or wider scope), and only keys of the catalog. */
  async set(actor: AccessContext, kind: PermissionTargetKind, id: string, grants: PermissionGrant[]): Promise<PermissionTargetDto> {
    await this.mustFind(kind, id);
    this.catalog.assertValid(grants);
    this.access.assertPermissionsGrantable(actor, grants);
    await this.targets.replace(kind, id, grants);
    this.events.emit(ACCESS_CHANGED, {});
    const event: AuditEvent = { actorId: actor.userId, action: 'permissions.updated', entityType: kind, entityId: id, changes: { keys: grants.map((g) => g.key) } };
    this.events.emit(AUDIT_EVENT, event);
    return this.get(kind, id);
  }

  private async mustFind(kind: PermissionTargetKind, id: string): Promise<TargetRef> {
    const found = await this.targets.find(kind, id);
    if (!found) throw new NotFoundError(kind, id);
    return found;
  }

  /** One row per key, at the widest scope it reaches the target with. */
  private merged(grants: PermissionGrant[]): PermissionGrant[] {
    const byKey = new Map<string, PermissionGrant['scope'][]>();
    for (const g of grants) byKey.set(g.key, [...(byKey.get(g.key) ?? []), g.scope]);
    return [...byKey].map(([key, scopes]) => ({ key, scope: widestScope(scopes) as PermissionGrant['scope'] }));
  }
}
