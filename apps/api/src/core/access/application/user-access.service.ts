import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { TransactionContext } from '../../../common/application/transaction-runner';
import type { AccessContext, Placement } from '../domain/access-context';
import { RoleRepository, UserAccessRepository } from '../domain/access.repository';
import type { Role } from '../domain/role.entity';
import { RoleGroupRepository } from '../domain/role-group.repository';
import { PermissionCatalog } from './permission-catalog';
import { carriesFields, fieldsOfGrant, scopeRank, type PermissionGrant } from '@arweqah-platform/shared';
import { ForbiddenError, NotFoundError } from '../../../common/domain/domain-error';
import { ACCESS_CHANGED } from './access.events';

/** The access module's public API for other modules (employees…). Placement itself lives on the employee record. */
@Injectable()
export class UserAccessService {
  constructor(
    private readonly access: UserAccessRepository,
    private readonly roles: RoleRepository,
    private readonly groups: RoleGroupRepository,
    private readonly catalog: PermissionCatalog,
    private readonly events: EventEmitter2,
  ) {}

  rolesOf(userIds: string[]): Promise<Map<string, Role[]>> {
    return this.access.rolesOf(userIds);
  }

  placementsOf(userIds: string[]): Promise<Map<string, Placement>> {
    return this.access.placementsOf(userIds);
  }

  groupsOf(userIds: string[]): Promise<Map<string, { id: string; nameAr: string; nameEn: string }[]>> {
    return this.access.groupsOf(userIds);
  }

  permissionsOf(userId: string): Promise<PermissionGrant[]> {
    return this.access.permissionsOf(userId);
  }

  roleExpiriesOf(userIds: string[]): Promise<Map<string, Map<string, string>>> {
    return this.access.roleExpiriesOf(userIds);
  }

  async replaceGroups(userId: string, groupIds: string[], grantedBy: string | null = null, tx?: TransactionContext): Promise<void> {
    const unique = [...new Set(groupIds)];
    const known = await this.groups.all();
    const missing = unique.find((id) => !known.some((g) => g.id === id));
    if (missing) throw new NotFoundError('Role group', missing);
    await this.access.replaceGroups(userId, unique, grantedBy, tx);
    this.events.emit(ACCESS_CHANGED, { userId });
  }

  async replacePermissions(userId: string, grants: PermissionGrant[], grantedBy: string | null = null, tx?: TransactionContext): Promise<void> {
    this.catalog.assertValid(grants);
    await this.access.replacePermissions(userId, grants, grantedBy, tx);
    this.events.emit(ACCESS_CHANGED, { userId });
  }

  async replaceRoles(userId: string, roleIds: string[], options: { expiries?: Record<string, string | null>; grantedBy?: string | null } = {}, tx?: TransactionContext): Promise<void> {
    const unique = [...new Set(roleIds)];
    const found = await this.roles.findByIds(unique);
    const missing = unique.find((id) => !found.some((r) => r.id === id));
    if (missing) throw new NotFoundError('Role', missing);
    await this.access.replaceRoles(userId, unique, options, tx);
    this.events.emit(ACCESS_CHANGED, { userId });
  }

  /**
   * Nobody can hand out more than they hold: every permission of the roles must be one the actor has,
   * at the same or a wider scope. Unknown roles are reported as not found.
   */
  async assertGrantable(actor: AccessContext, roleIds: string[], exempt: readonly string[] = []): Promise<void> {
    const unique = [...new Set(roleIds)];
    const roles = await this.roles.findByIds(unique);
    const missing = unique.find((id) => !roles.some((r) => r.id === id));
    if (missing) throw new NotFoundError('Role', missing);
    this.assertHolds(actor, roles.filter((r) => !exempt.includes(r.id)).flatMap((r) => r.permissions));
  }

  /** The roles a new employee starts with: the base role (Employee, or the collaborator base) and the role of their job title (those that exist). */
  async defaultRoleIds(jobTitleId: string | null, limitedAccess = false): Promise<{ baseId: string | null; titleId: string | null; ids: string[] }> {
    const { baseId, titleId } = await this.access.defaultRoleIdsFor(jobTitleId, limitedAccess);
    return { baseId, titleId, ids: [baseId, titleId].filter((id): id is string => !!id) };
  }

  /** A change of relation (employee ↔ collaborator) changes the base role only; the roles chosen by hand stay. */
  async swapBaseRole(userId: string, limitedAccess: boolean): Promise<void> {
    await this.access.swapBaseRole(userId, limitedAccess);
    this.events.emit(ACCESS_CHANGED, { userId });
  }

  /** The head role of a unit follows who manages it: given to the manager, taken back from one who no longer does. */
  async syncHeadRole(nodeId: string, employeeId: string): Promise<void> {
    await this.access.syncHeadRole(nodeId, employeeId);
    this.events.emit(ACCESS_CHANGED, {});
  }

  /** The same rule for groups: every role inside them must be grantable by the actor. */
  async assertGroupsGrantable(actor: AccessContext, groupIds: string[]): Promise<void> {
    const known = await this.groups.all();
    const wanted = [...new Set(groupIds)];
    const missing = wanted.find((id) => !known.some((g) => g.id === id));
    if (missing) throw new NotFoundError('Role group', missing);
    await this.assertGrantable(actor, known.filter((g) => wanted.includes(g.id)).flatMap((g) => g.roleIds));
  }

  /** Personal permissions follow the same rule: nobody gives what they do not hold at the same or a wider scope. */
  assertPermissionsGrantable(actor: AccessContext, grants: PermissionGrant[]): void {
    this.assertHolds(actor, grants);
  }

  private assertHolds(actor: AccessContext, grants: PermissionGrant[]): void {
    for (const grant of grants) {
      const own = actor.scopeOf(grant.key);
      if (!own || scopeRank(own) < scopeRank(grant.scope)) throw new ForbiddenError('You cannot assign more than you hold');
      this.assertHoldsFields(actor, grant);
    }
  }

  /** Nobody gives a field to change that they cannot change themselves: the fields of a grant stay inside the union of the fields the giver holds. */
  private assertHoldsFields(actor: AccessContext, grant: PermissionGrant): void {
    if (!carriesFields(grant.key)) return;
    const held = new Set(actor.grantsOf(grant.key).flatMap((g) => fieldsOfGrant(g)));
    if (fieldsOfGrant(grant).some((field) => !held.has(field))) throw new ForbiddenError('You cannot assign more than you hold');
  }
}
