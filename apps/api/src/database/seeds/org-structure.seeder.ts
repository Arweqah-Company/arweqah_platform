import { Injectable, Logger } from '@nestjs/common';
import { ORG_ADMIN_PERMISSIONS } from '@arweqah-platform/shared';
import { AccessContext, NO_PLACEMENT } from '../../core/access/domain/access-context';
import { CompaniesService } from '../../modules/org/application/services/companies.service';
import { OrgLevelsService } from '../../modules/org/application/services/org-levels.service';
import { OrgNodesService } from '../../modules/org/application/services/org-nodes.service';
import { OrgTreeService } from '../../modules/org/application/services/org-tree.service';
import { OrgLevelsSeeder } from './org-levels.seeder';
import { ORG_STRUCTURE, type OrgSeedNode } from './data/org-structure.data';

const SEEDER_ID = '00000000-0000-4000-8000-000000000002';

/** Gives Arweqah Alreyadah its real structure and job titles, from the owner's official file, in every environment (the server included), and only while the company has no units yet: it never touches a structure someone built or changed. */
const COMPANY_CODE = 'ARW';
/** The file has no dates, so every unit starts on the same day. */
const DEMO_START_DATE = '2024-01-01';

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
    private readonly tree: OrgTreeService,
    private readonly levelsSeeder: OrgLevelsSeeder,
  ) {}

  async run(): Promise<void> {
    const company = (await this.companies.list()).find((c) => c.code === COMPANY_CODE);
    if (!company || (await this.tree.tree(this.ctx, { view: 'full' })).nodes.length > 0) return;
    await this.levelsSeeder.ensureDefaultRules();
    await this.seedGroup();
    this.logger.log(`Organization structure created for the group (${company.code})`);
  }

  /** A node is made with its titles, then its children under it (parents first, in the file's order, so unit codes follow it). */
  private async seedGroup(): Promise<void> {
    const levels = new Map((await this.levels.list()).levels.map((l) => [l.key, l.id]));
    const create = async (node: OrgSeedNode, parentId: string | null): Promise<void> => {
      const input = {
        levelId: levels.get(node.kind) as string,
        parentId,
        nameAr: node.ar,
        nameEn: node.en,
        startDate: DEMO_START_DATE,
        jobTitles: node.titles.map((title) => ({ nameAr: title.ar, nameEn: title.en, grade: title.grade, track: title.track })),
        // A top unit gets the file's code prefix; the group's top units are managed centrally, so they are shared.
        ...(parentId ? {} : { codePrefix: node.prefix, managementMode: 'shared' as const }),
      };
      const { id } = await this.nodes.createNode(this.ctx, input, SEEDER_ID);
      for (const child of node.children) await create(child, id);
    };
    for (const top of ORG_STRUCTURE) await create(top, null);
  }
}
