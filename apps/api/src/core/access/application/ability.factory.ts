import { Injectable } from '@nestjs/common';
import { createMongoAbility, subject, type MongoAbility, type RawRuleOf } from '@casl/ability';
import { fieldsOfGrant, isTreeScope, type PermissionScope } from '@arweqah-platform/shared';
import type { AccessContext, ScopedResource } from '../domain/access-context';
import { ForbiddenError } from '../../../common/domain/domain-error';

type AppAbility = MongoAbility;
type Rule = RawRuleOf<AppAbility>;

/**
 * Turns scoped grants into CASL rules so single records are checked the same
 * way everywhere: `ability.assertCan(ctx, 'employees.update', employee)`.
 */
@Injectable()
export class AbilityFactory {
  build(ctx: AccessContext): AppAbility {
    const rules: Rule[] = [];
    for (const { key, scope } of ctx.grants()) {
      rules.push(...this.rulesFor(ctx, key, scope));
      // Every grant includes the user's own records.
      rules.push({ action: key, subject: 'Record', conditions: { ownerId: ctx.userId } });
    }
    return createMongoAbility(rules);
  }

  /**
   * A unit-based scope without a placement means no unit-wide access, only the user's own records. In a unit managed per company the
   * scope reaches only the people of the person's company, so such units get their own rule with the company condition.
   */
  private rulesFor(ctx: AccessContext, key: string, scope: PermissionScope): Rule[] {
    const { companyId } = ctx.placement;
    const base = { action: key, subject: 'Record' };
    if (scope === 'all') return [base];
    if (scope === 'company') return companyId ? [{ ...base, conditions: { companyId } }] : [];
    const ids = ctx.nodesFor(scope);
    if (!isTreeScope(scope) || !ids.length) return [];
    const restricted = new Set(ctx.restrictedNodesFor(scope));
    const free = ids.filter((id) => !restricted.has(id));
    return [
      ...(free.length ? [{ ...base, conditions: { orgNodeId: { $in: free } } }] : []),
      ...(restricted.size && companyId ? [{ ...base, conditions: { orgNodeId: { $in: [...restricted] }, companyId } }] : []),
    ];
  }

  can(ctx: AccessContext, key: string, resource: ScopedResource): boolean {
    return this.build(ctx).can(key, subject('Record', { ...resource }));
  }

  /**
   * The fields a person may change of one record (FR-94): the union of the fields of every grant of the permission whose reach includes the record.
   * Like every grant, each one includes the person's own record.
   */
  fieldsFor(ctx: AccessContext, key: string, resource: ScopedResource): string[] {
    const fields = new Set<string>();
    for (const grant of ctx.grantsOf(key)) {
      if (this.reaches(ctx, key, grant.scope, resource)) for (const field of fieldsOfGrant(grant)) fields.add(field);
    }
    return [...fields];
  }

  /** Does this one grant (by its own scope) reach the record? */
  private reaches(ctx: AccessContext, key: string, scope: PermissionScope, resource: ScopedResource): boolean {
    const rules: Rule[] = [...this.rulesFor(ctx, key, scope), { action: key, subject: 'Record', conditions: { ownerId: ctx.userId } }];
    return createMongoAbility(rules).can(key, subject('Record', { ...resource }));
  }

  assertCan(ctx: AccessContext, key: string, resource: ScopedResource): void {
    if (!this.can(ctx, key, resource)) throw new ForbiddenError();
  }
}
