import { Injectable, Logger } from '@nestjs/common';
import { ORG_ADMIN_PERMISSIONS } from '@arweqah-platform/shared';
import { AccessContext, NO_PLACEMENT } from '../../core/access/domain/access-context';
import { CompaniesService } from '../../modules/org/application/services/companies.service';
import { OrgLevelsService } from '../../modules/org/application/services/org-levels.service';
import { OrgNodesService } from '../../modules/org/application/services/org-nodes.service';
import { ORG_STRUCTURE, type OrgKind } from './data/org-structure.data';

const SEEDER_ID = '00000000-0000-4000-8000-000000000002';

/** Gives Arweqah Alreyadah its real structure, from the owner's sheet, in every environment (the server included), and only while the company has no units yet: it never touches a structure someone built or changed. */
const COMPANY_CODE = 'ARW';
/** The sheet has no dates, so every unit starts on the same day. */
const DEMO_START_DATE = '2024-01-01';
/** A unit needs at least one job title and the sheet has none, so each gets this neutral one until HR defines the real titles. */
const PLACEHOLDER_TITLE = { ar: 'موظف', en: 'Employee' };
const KINDS: OrgKind[] = ['sector', 'department', 'section', 'unit'];

@Injectable()
export class OrgStructureSeeder {
  private readonly logger = new Logger('Seed');
  private readonly ctx = new AccessContext(SEEDER_ID, NO_PLACEMENT, [
    ...ORG_ADMIN_PERMISSIONS.map((key) => ({ key, scope: 'all' as const })),
  ], true);

  constructor(
    private readonly companies: CompaniesService,
    private readonly levels: OrgLevelsService,
    private readonly nodes: OrgNodesService,
  ) {}

  async run(): Promise<void> {
    const company = (await this.companies.list()).find((c) => c.code === COMPANY_CODE);
    if (!company || (await this.nodes.tree(this.ctx, company.id)).nodes.length > 0) return;
    await this.seedCompany(company.id);
    this.logger.log(`Organization structure created for ${company.code}`);
  }

  /** Rows come parents first; a parent is found by name among the nodes of the level above. */
  private async seedCompany(companyId: string): Promise<void> {
    const levels = (await this.levels.list(companyId)).map((l) => l.id);
    const created = new Map<string, string>();
    for (const row of ORG_STRUCTURE) {
      const level = KINDS.indexOf(row.kind);
      const parentId = row.parent ? created.get(`${level - 1}:${row.parent}`) ?? null : null;
      created.set(`${level}:${row.ar}`, await this.create(levels[level], parentId, { ar: row.ar, en: row.en }, row.kind === 'unit' ? [PLACEHOLDER_TITLE] : []));
    }
  }

  private async create(levelId: string | undefined, parentId: string | null, names: { ar: string; en: string }, titles: { ar: string; en: string }[]): Promise<string> {
    const node = await this.nodes.createNode(
      this.ctx,
      { levelId: levelId as string, parentId, nameAr: names.ar, nameEn: names.en, startDate: DEMO_START_DATE, jobTitles: titles.map((t) => ({ nameAr: t.ar, nameEn: t.en })) },
      SEEDER_ID,
    );
    return node.id;
  }
}
