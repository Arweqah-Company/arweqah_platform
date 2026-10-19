import { Injectable } from '@nestjs/common';
import { createMongoAbility, subject, type MongoAbility, type RawRuleOf } from '@casl/ability';
import type { AccessContext, ScopedResource } from '../domain/access-context';
import { ForbiddenError } from '../../../common/domain/domain-error';

type AppAbility = MongoAbility;

/**
 * Turns scoped grants into CASL rules so single records are checked the same
 * way everywhere: `ability.assertCan(ctx, 'leaves.approve', leave)`.
 */
@Injectable()
export class AbilityFactory {
  build(ctx: AccessContext): AppAbility {
    const rules: RawRuleOf<AppAbility>[] = [];
    const p = ctx.placement;
    const unitByScope = { team: { teamId: p.teamId }, department: { departmentId: p.departmentId }, branch: { branchId: p.branchId } };
    for (const { key, scope } of ctx.grants()) {
      if (scope === 'company') rules.push({ action: key, subject: 'Record' });
      if (scope !== 'company' && scope !== 'own') {
        const condition = unitByScope[scope];
        // No placement means no unit-wide access, only the user's own records.
        if (Object.values(condition)[0]) rules.push({ action: key, subject: 'Record', conditions: condition });
      }
      rules.push({ action: key, subject: 'Record', conditions: { ownerId: ctx.userId } });
    }
    return createMongoAbility(rules);
  }

  can(ctx: AccessContext, key: string, resource: ScopedResource): boolean {
    return this.build(ctx).can(key, subject('Record', { ...resource }));
  }

  assertCan(ctx: AccessContext, key: string, resource: ScopedResource): void {
    if (!this.can(ctx, key, resource)) throw new ForbiddenError();
  }
}
