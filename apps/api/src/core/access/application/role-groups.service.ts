import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { RoleGroupDto, RoleGroupInput } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import type { AccessContext } from '../domain/access-context';
import { RoleRepository } from '../domain/access.repository';
import { RoleGroupRepository, type RoleGroupRecord } from '../domain/role-group.repository';
import { ACCESS_CHANGED } from './access.events';
import { UserAccessService } from './user-access.service';

/** Groups of roles: one name for a bundle of roles that go together (a team, a job). */
@Injectable()
export class RoleGroupsService {
  constructor(
    private readonly groups: RoleGroupRepository,
    private readonly roles: RoleRepository,
    private readonly access: UserAccessService,
    private readonly events: EventEmitter2,
  ) {}

  async list(): Promise<RoleGroupDto[]> {
    const [groups, roles] = await Promise.all([this.groups.all(), this.roles.findAll()]);
    return groups.map((g) => this.toDto(g, roles));
  }

  async create(input: RoleGroupInput, actorId: string): Promise<RoleGroupDto> {
    await this.assertRoles(input.roleIds);
    const id = await this.groups.insert({ ...input, description: input.description ?? null });
    this.audit(actorId, 'role_group.created', id, { roles: input.roleIds.length });
    return this.one(id);
  }

  async update(ctx: AccessContext, id: string, input: RoleGroupInput, actorId: string): Promise<RoleGroupDto> {
    const current = await this.groups.find(id);
    if (!current) throw new NotFoundError('Role group', id);
    await this.assertRoles(input.roleIds);
    await this.assertCanBringGroupGrants(ctx, id, current.roleIds, input.roleIds);
    await this.groups.update(id, { ...input, description: input.description ?? null });
    this.events.emit(ACCESS_CHANGED, {});
    this.audit(actorId, 'role_group.updated', id, { roles: input.roleIds.length });
    return this.one(id);
  }

  async remove(id: string, actorId: string): Promise<void> {
    const group = await this.groups.find(id);
    if (!group) throw new NotFoundError('Role group', id);
    await this.groups.remove(id);
    this.events.emit(ACCESS_CHANGED, {});
    this.audit(actorId, 'role_group.deleted', id, { nameEn: group.nameEn });
  }

  /** A role added to a group takes the group's permissions with it: only someone who could hand those out themselves may add one. */
  private async assertCanBringGroupGrants(ctx: AccessContext, id: string, before: string[], after: string[]): Promise<void> {
    if (!after.some((roleId) => !before.includes(roleId))) return;
    this.access.assertPermissionsGrantable(ctx, await this.groups.grantsOf(id));
  }

  private async one(id: string): Promise<RoleGroupDto> {
    const [group, roles] = await Promise.all([this.groups.find(id), this.roles.findAll()]);
    return this.toDto(group as RoleGroupRecord, roles);
  }

  private async assertRoles(roleIds: string[]): Promise<void> {
    const unique = [...new Set(roleIds)];
    const found = await this.roles.findByIds(unique);
    const missing = unique.find((id) => !found.some((r) => r.id === id));
    if (missing) throw new NotFoundError('Role', missing);
  }

  private toDto(group: RoleGroupRecord, roles: { id: string; nameAr: string; nameEn: string }[]): RoleGroupDto {
    return {
      id: group.id,
      nameAr: group.nameAr,
      nameEn: group.nameEn,
      description: group.description,
      roles: roles.filter((r) => group.roleIds.includes(r.id)).map((r) => ({ id: r.id, nameAr: r.nameAr, nameEn: r.nameEn })),
      usersCount: group.usersCount,
    };
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'role_group', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
