import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.service';
import { CorePermission } from '@arweqah-platform/shared';
import { AccessContext, NO_PLACEMENT } from '../../core/access/domain/access-context';
import { CompaniesService } from '../../modules/org/application/services/companies.service';
import { OrgLevelsService } from '../../modules/org/application/services/org-levels.service';
import { OrgNodesService } from '../../modules/org/application/services/org-nodes.service';
import { DEMO_DEPARTMENTS, DEMO_SECTOR } from './data/demo-org.data';

const SEEDER_ID = '00000000-0000-4000-8000-000000000002';

/** Development only (SEED_DEMO_ORG): gives every company that has no units yet a small sample structure. */
/** Sample units start on the same day (development only). */
const DEMO_START_DATE = '2024-01-01';

@Injectable()
export class OrgDemoSeeder {
  private readonly logger = new Logger('Seed');
  private readonly ctx = new AccessContext(SEEDER_ID, NO_PLACEMENT, [
    { key: CorePermission.OrgView, scope: 'all' },
    { key: CorePermission.OrgManage, scope: 'all' },
  ], true);

  constructor(
    private readonly config: AppConfig,
    private readonly companies: CompaniesService,
    private readonly levels: OrgLevelsService,
    private readonly nodes: OrgNodesService,
  ) {}

  async run(): Promise<void> {
    if (!this.config.get('SEED_DEMO_ORG')) return;
    for (const company of await this.companies.list()) {
      const tree = await this.nodes.tree(this.ctx, company.id);
      if (tree.nodes.length > 0) continue;
      await this.seedCompany(company.id);
      this.logger.log(`Sample structure created for ${company.code}`);
    }
  }

  private async seedCompany(companyId: string): Promise<void> {
    const [sectorLevel, departmentLevel, sectionLevel, unitLevel] = (await this.levels.list(companyId)).map((l) => l.id);
    const sector = await this.create(sectorLevel, null, DEMO_SECTOR, []);
    for (const { department, units } of DEMO_DEPARTMENTS) {
      const departmentNode = await this.create(departmentLevel, sector, department, []);
      for (const { section, unit, titles } of units) {
        const sectionNode = await this.create(sectionLevel, departmentNode, section, []);
        await this.create(unitLevel, sectionNode, unit, titles);
      }
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
