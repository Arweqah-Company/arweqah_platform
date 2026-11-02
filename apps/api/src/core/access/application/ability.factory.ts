import { Injectable } from '@nestjs/common';
import { createMongoAbility, subject, type MongoAbility, type RawRuleOf } from '@casl/ability';
import type { PermissionScope } from '@arweqah-platform/shared';
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
      case 'subtree':
        return ctx.subtreeNodeIds.length ? { ...base, conditions: { orgNodeId: { $in: [...ctx.subtreeNodeIds] } } } : null;
      case 'unit':
        return ctx.unitNodeIds.length ? { ...base, conditions: { orgNodeId: { $in: [...ctx.unitNodeIds] } } } : null;
      default:
        return null;
    }
  }

  can(ctx: AccessContext, key: string, resource: ScopedResource): boolean {
    return this.build(ctx).can(key, subject('Record', { ...resource }));
  }

  assertCan(ctx: AccessContext, key: string, resource: ScopedResource): void {
    if (!this.can(ctx, key, resource)) throw new ForbiddenError();
  }
}
