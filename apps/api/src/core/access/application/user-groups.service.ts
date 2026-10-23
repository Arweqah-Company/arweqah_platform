import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UserGroupDto, UserGroupInput } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import { PermissionTargetRepository, type TargetRef } from '../domain/permission-target.repository';
import { UserGroupRepository } from '../domain/user-group.repository';
import { ACCESS_CHANGED } from './access.events';

/** Groups of people: chosen one by one, they all get the permissions placed on the group. */
@Injectable()
export class UserGroupsService {
  constructor(
    private readonly groups: UserGroupRepository,
    private readonly people: PermissionTargetRepository,
    private readonly events: EventEmitter2,
  ) {}

  list(): Promise<UserGroupDto[]> {
    return this.groups.all();
  }

  /** People to choose as members. */
  searchPeople(search?: string): Promise<TargetRef[]> {
    return this.people.list('user', search);
  }

  async create(input: UserGroupInput, actorId: string): Promise<UserGroupDto> {
    await this.assertPeople(input.userIds);
    const id = await this.groups.insert({ ...input, description: input.description ?? null });
    this.audit(actorId, 'user_group.created', id, { members: input.userIds.length });
    return this.one(id);
  }

  async update(id: string, input: UserGroupInput, actorId: string): Promise<UserGroupDto> {
    if (!(await this.groups.find(id))) throw new NotFoundError('User group', id);
    await this.assertPeople(input.userIds);
    await this.groups.update(id, { ...input, description: input.description ?? null });
    this.events.emit(ACCESS_CHANGED, {});
    this.audit(actorId, 'user_group.updated', id, { members: input.userIds.length });
    return this.one(id);
  }

  async remove(id: string, actorId: string): Promise<void> {
    const group = await this.groups.find(id);
    if (!group) throw new NotFoundError('User group', id);
    await this.groups.remove(id);
    this.events.emit(ACCESS_CHANGED, {});
    this.audit(actorId, 'user_group.deleted', id, { nameEn: group.nameEn });
  }

  private async one(id: string): Promise<UserGroupDto> {
    return (await this.groups.find(id)) as UserGroupDto;
  }

  private async assertPeople(userIds: string[]): Promise<void> {
    const unique = [...new Set(userIds)];
    const found = await this.groups.existingUsers(unique);
    const missing = unique.find((id) => !found.includes(id));
    if (missing) throw new NotFoundError('User', missing);
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'user_group', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
