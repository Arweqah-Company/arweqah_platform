import { Injectable } from '@nestjs/common';
import type { AccessSourceDto, MyAccessDto, MyAccessGrantDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../domain/access-context';
import { sourcesByKey } from '../domain/my-access.rules';
import { UserAccessRepository } from '../domain/access.repository';
import { DIRECT_SOURCE } from './my-access.messages';
import { PermissionCatalog } from './permission-catalog';

/** What the signed-in person may do right now and where each permission comes from (GET /api/me/access). */
@Injectable()
export class MyAccessService {
  constructor(
    private readonly access: UserAccessRepository,
    private readonly catalog: PermissionCatalog,
  ) {}

  /** `ctx` is the context the guard built for this request: it already leaves out the administrative role while admin mode is off. */
  async of(ctx: AccessContext): Promise<MyAccessDto> {
    const [roles, rows] = await Promise.all([this.access.rolesOf([ctx.userId]), this.access.grantSourcesOf(ctx.userId)]);
    const sources = sourcesByKey(rows, !ctx.hasElevatedGrants);
    const definitions = new Map(this.catalog.all().map((d) => [d.key, d]));
    const grants = ctx.grants().map((grant): MyAccessGrantDto => {
      const def = definitions.get(grant.key);
      // A grant the catalog does not know (a module that was removed) still counts for the guard, so it is still told, under its key.
      return { key: grant.key, module: def?.module ?? grant.key.split('.')[0] ?? grant.key, labelAr: def?.labelAr ?? grant.key, labelEn: def?.labelEn ?? grant.key, scope: grant.scope, sources: (sources.get(grant.key) ?? []).map(named) };
    });
    return {
      roles: (roles.get(ctx.userId) ?? []).map((r) => ({ id: r.id, nameAr: r.nameAr, nameEn: r.nameEn, assignment: r.assignment })),
      grants,
      adminRolesHidden: ctx.hasElevatedGrants,
    };
  }
}

function named(source: AccessSourceDto): AccessSourceDto {
  return source.kind === 'direct' ? { ...source, ...DIRECT_SOURCE } : source;
}
