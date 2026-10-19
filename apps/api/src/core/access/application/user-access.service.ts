import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { TransactionContext } from '../../../common/application/transaction-runner';
import type { Placement } from '../domain/access-context';
import { RoleRepository, UserAccessRepository } from '../domain/access.repository';
import type { Role } from '../domain/role.entity';
import { NotFoundError } from '../../../common/domain/domain-error';
import { ACCESS_CHANGED } from './access.events';

/** The access module's public API for other modules (users, HR…). */
@Injectable()
export class UserAccessService {
  constructor(
    private readonly access: UserAccessRepository,
    private readonly roles: RoleRepository,
    private readonly events: EventEmitter2,
  ) {}

  rolesOf(userIds: string[]): Promise<Map<string, Role[]>> {
    return this.access.rolesOf(userIds);
  }

  placementsOf(userIds: string[]): Promise<Map<string, Placement>> {
    return this.access.placementsOf(userIds);
  }

  async replaceRoles(userId: string, roleIds: string[], tx?: TransactionContext): Promise<void> {
    const unique = [...new Set(roleIds)];
    const found = await this.roles.findByIds(unique);
    const missing = unique.find((id) => !found.some((r) => r.id === id));
    if (missing) throw new NotFoundError('Role', missing);
    await this.access.replaceRoles(userId, unique, tx);
    this.events.emit(ACCESS_CHANGED, { userId });
  }

  async savePlacement(userId: string, placement: Placement, tx?: TransactionContext): Promise<void> {
    await this.access.savePlacement(userId, placement, tx);
    this.events.emit(ACCESS_CHANGED, { userId });
  }
}
