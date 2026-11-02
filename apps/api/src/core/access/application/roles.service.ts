import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { RoleDto, RoleOriginDto, RoleSyncResultDto, UpsertRoleInput } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../common/domain/domain-error';
import { Role } from '../domain/role.entity';
import { RoleRepository } from '../domain/access.repository';
import { PermissionCatalog } from './permission-catalog';
import { ACCESS_CHANGED } from './access.events';
import { AutoRolesService } from './auto-roles.service';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';

@Injectable()
export class RolesService {
  constructor(
    private readonly roles: RoleRepository,
    private readonly catalog: PermissionCatalog,
    private readonly events: EventEmitter2,
    private readonly autoRoles: AutoRolesService,
  ) {}

  async list(): Promise<RoleDto[]> {
    const roles = await this.roles.findAll();
    return roles.map((r) => toRoleDto(r, r.usersCount, r.origin));
  }

  async create(input: UpsertRoleInput, actorId: string): Promise<RoleDto> {
    this.catalog.assertValid(input.permissions);
    const role = Object.assign(new Role(), {
      id: randomUUID(),
      nameAr: input.nameAr,
      nameEn: input.nameEn,
      description: input.description ?? null,
      isSystem: false,
      assignment: input.assignment ?? 'manual',
      autoRule: null,
      jobTitleId: null,
      orgNodeId: null,
      permissions: [],
    });
    role.replacePermissions(input.permissions);
    const saved = await this.roles.save(role);
    this.audit(actorId, 'role.created', saved.id, { permissions: input.permissions });
    return toRoleDto(saved, 0);
  }

  async update(id: string, input: UpsertRoleInput, actorId: string): Promise<RoleDto> {
    this.catalog.assertValid(input.permissions);
    const role = await this.getOrThrow(id);
    role.assertAssignment(input.assignment);
    role.assertNameUnchanged(input);
    Object.assign(role, { nameAr: input.nameAr, nameEn: input.nameEn, description: input.description ?? null, assignment: input.assignment ?? role.assignment });
    role.replacePermissions(input.permissions);
    const saved = await this.roles.save(role);
    this.events.emit(ACCESS_CHANGED, {});
    this.audit(actorId, 'role.updated', id, { permissions: input.permissions });
    return toRoleDto(saved, 0);
  }

  async remove(id: string, actorId: string): Promise<void> {
    const role = await this.getOrThrow(id);
    role.assertDeletable();
    await this.roles.remove(role);
    this.events.emit(ACCESS_CHANGED, {});
    this.audit(actorId, 'role.deleted', id, { nameEn: role.nameEn });
  }

  /** Refreshes the members of every automatic role now (they are also refreshed after each change and every night). */
  async syncAuto(actorId: string): Promise<RoleSyncResultDto> {
    const changed = await this.autoRoles.refresh();
    this.audit(actorId, 'role.auto_synced', 'auto-roles', { changed });
    return { changed };
  }

  private async getOrThrow(id: string): Promise<Role> {
    const role = await this.roles.findById(id);
    if (!role) throw new NotFoundError('Role', id);
    return role;
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'role', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}

export function toRoleDto(role: Role, usersCount: number, origin: RoleOriginDto | null = null): RoleDto {
  return {
    id: role.id,
    nameAr: role.nameAr,
    nameEn: role.nameEn,
    description: role.description,
    isSystem: role.isSystem,
    assignment: role.assignment,
    autoRule: role.autoRule,
    jobTitleId: role.jobTitleId,
    orgNodeId: role.orgNodeId,
    origin,
    permissions: (role.permissions ?? []).map((p) => ({ key: p.key, scope: p.scope })),
    usersCount,
  };
}
