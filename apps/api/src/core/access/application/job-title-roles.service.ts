import { Injectable } from '@nestjs/common';
import type { PermissionGrant } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../common/application/transaction-runner';
import type { AccessContext } from '../domain/access-context';
import { RoleTemplateError } from '../domain/errors';
import { RoleRepository } from '../domain/access.repository';
import { UserAccessService } from './user-access.service';

/** A job title that needs its role: the role copies its permissions from `templateRoleId`, or starts empty when none is chosen (the Employee role gives the baseline). */
export interface JobTitleRoleRequest {
  jobTitleId: string;
  nameAr: string;
  nameEn: string;
  templateRoleId?: string;
}

const NAME_MAX = 120;

/** The role each job title owns (auto rule `job_title`): made with the title, named after it and removed with it. Used by the organization module. */
@Injectable()
export class JobTitleRolesService {
  constructor(
    private readonly roles: RoleRepository,
    private readonly access: UserAccessService,
  ) {}

  /** Checks the chosen templates before anything is saved: they must exist, not follow the organization themselves, and be roles the actor could hand out. */
  async assertTemplates(actor: AccessContext, templateRoleIds: (string | undefined)[]): Promise<void> {
    const ids = [...new Set(templateRoleIds.filter((id): id is string => !!id))];
    if (!ids.length) return;
    await this.access.assertGrantable(actor, ids);
    if ((await this.roles.findByIds(ids)).some((r) => r.isDerived)) throw new RoleTemplateError();
  }

  async create(requests: JobTitleRoleRequest[], tx: TransactionContext): Promise<void> {
    if (!requests.length) return;
    const fallback = await this.roles.defaultTemplatePermissions();
    const templates = new Map((await this.roles.findByIds([...new Set(requests.map((r) => r.templateRoleId).filter((id): id is string => !!id))])).map((r) => [r.id, r]));
    const seeds = requests.map((r) => ({
      jobTitleId: r.jobTitleId,
      nameAr: r.nameAr.slice(0, NAME_MAX),
      nameEn: r.nameEn.slice(0, NAME_MAX),
      permissions: this.permissionsOf(r.templateRoleId ? templates.get(r.templateRoleId) : undefined, fallback),
    }));
    await this.roles.insertJobTitleRoles(seeds, tx);
  }

  rename(jobTitleId: string, names: { nameAr: string; nameEn: string }, tx: TransactionContext): Promise<void> {
    return this.roles.renameJobTitleRole(jobTitleId, { nameAr: names.nameAr.slice(0, NAME_MAX), nameEn: names.nameEn.slice(0, NAME_MAX) }, tx);
  }

  remove(jobTitleIds: string[], tx: TransactionContext): Promise<void> {
    return this.roles.removeJobTitleRoles(jobTitleIds, tx);
  }

  private permissionsOf(template: { permissions: { key: string; scope: PermissionGrant['scope'] }[] } | undefined, fallback: PermissionGrant[]): PermissionGrant[] {
    return template ? template.permissions.map((p) => ({ key: p.key, scope: p.scope })) : fallback;
  }
}
