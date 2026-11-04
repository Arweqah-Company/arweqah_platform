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
      const rule = this.ruleFor(ctx, key, scope);
      if (rule) rules.push(rule);
      // Every grant includes the user's own records.
      rules.push({ action: key, subject: 'Record', conditions: { ownerId: ctx.userId } });
    }
    return createMongoAbility(rules);
  }

  /** A unit-based scope without a placement means no unit-wide access, only the user's own records. */
  private ruleFor(ctx: AccessContext, key: string, scope: PermissionScope): Rule | null {
    const { companyId } = ctx.placement;
    const base = { action: key, subject: 'Record' };
    switch (scope) {
      case 'all':
        return base;
      case 'company':
        return companyId ? { ...base, conditions: { companyId } } : null;
      default: {
        const ids = ctx.nodesFor(scope);
        return isTreeScope(scope) && ids.length ? { ...base, conditions: { orgNodeId: { $in: [...ids] } } } : null;
      }
    }
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
    const rule = this.ruleFor(ctx, key, scope);
    const rules: Rule[] = [...(rule ? [rule] : []), { action: key, subject: 'Record', conditions: { ownerId: ctx.userId } }];
    return createMongoAbility(rules).can(key, subject('Record', { ...resource }));
  }

  assertCan(ctx: AccessContext, key: string, resource: ScopedResource): void {
    if (!this.can(ctx, key, resource)) throw new ForbiddenError();
  }
}
