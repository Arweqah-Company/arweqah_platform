import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { RoleDto, UpsertRoleInput } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../common/domain/domain-error';
import { Role } from '../domain/role.entity';
import { RoleRepository } from '../domain/access.repository';
import { PermissionCatalog } from './permission-catalog';
import { ACCESS_CHANGED } from './access.events';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';

@Injectable()
export class RolesService {
  constructor(
    private readonly roles: RoleRepository,
    private readonly catalog: PermissionCatalog,
    private readonly events: EventEmitter2,
  ) {}

  async list(): Promise<RoleDto[]> {
    const roles = await this.roles.findAll();
    return roles.map((r) => toRoleDto(r, r.usersCount));
  }

  async create(input: UpsertRoleInput, actorId: string): Promise<RoleDto> {
    this.catalog.assertValid(input.permissions);
    const role = Object.assign(new Role(), {
      id: randomUUID(),
      nameAr: input.nameAr,
      nameEn: input.nameEn,
      description: input.description ?? null,
      isSystem: false,
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
    Object.assign(role, { nameAr: input.nameAr, nameEn: input.nameEn, description: input.description ?? null });
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

export function toRoleDto(role: Role, usersCount: number): RoleDto {
  return {
    id: role.id,
    nameAr: role.nameAr,
    nameEn: role.nameEn,
    description: role.description,
    isSystem: role.isSystem,
    permissions: (role.permissions ?? []).map((p) => ({ key: p.key, scope: p.scope })),
    usersCount,
  };
}
