import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { TransactionContext } from '../../../common/application/transaction-runner';
import type { AccessContext, Placement } from '../domain/access-context';
import { RoleRepository, UserAccessRepository } from '../domain/access.repository';
import type { Role } from '../domain/role.entity';
import { scopeRank } from '@arweqah-platform/shared';
import { ForbiddenError, NotFoundError } from '../../../common/domain/domain-error';
import { ACCESS_CHANGED } from './access.events';

/** The access module's public API for other modules (employees…). Placement itself lives on the employee record. */
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

  /**
   * Nobody can hand out more than they hold: every permission of the roles must be one the actor has,
   * at the same or a wider scope. Unknown roles are reported as not found.
   */
  async assertGrantable(actor: AccessContext, roleIds: string[]): Promise<void> {
    const unique = [...new Set(roleIds)];
    const roles = await this.roles.findByIds(unique);
    const missing = unique.find((id) => !roles.some((r) => r.id === id));
    if (missing) throw new NotFoundError('Role', missing);
    for (const grant of roles.flatMap((r) => r.permissions)) {
      const own = actor.scopeOf(grant.key);
      if (!own || scopeRank(own) < scopeRank(grant.scope)) throw new ForbiddenError('You cannot assign a role that grants more than you hold');
    }
  }
}
