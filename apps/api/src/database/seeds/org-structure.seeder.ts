import { Injectable, Logger } from '@nestjs/common';
import { ORG_ADMIN_PERMISSIONS } from '@arweqah-platform/shared';
import { AccessContext, NO_PLACEMENT } from '../../core/access/domain/access-context';
import { CompaniesService } from '../../modules/org/application/services/companies.service';
import { OrgLevelsService } from '../../modules/org/application/services/org-levels.service';
import { OrgNodesService } from '../../modules/org/application/services/org-nodes.service';
import { OrgTreeService } from '../../modules/org/application/services/org-tree.service';
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
    private readonly tree: OrgTreeService,
  ) {}

  async run(): Promise<void> {
    const company = (await this.companies.list()).find((c) => c.code === COMPANY_CODE);
    if (!company || (await this.tree.tree(this.ctx, { view: 'full' })).nodes.length > 0) return;
    await this.seedGroup();
    this.logger.log(`Organization structure created for the group (${company.code})`);
  }

  /** Rows come parents first; a parent is found by name among the nodes of the level above. */
  private async seedGroup(): Promise<void> {
    const levels = new Map((await this.levels.list()).levels.map((l) => [l.key, l.id]));
    const created = new Map<string, string>();
    const prefixes = new Set<string>();
    for (const row of ORG_STRUCTURE) {
      const level = KINDS.indexOf(row.kind);
      const parentId = row.parent ? created.get(`${level - 1}:${row.parent}`) ?? null : null;
      const input = { levelId: levels.get(row.kind) as string, parentId, nameAr: row.ar, nameEn: row.en, startDate: DEMO_START_DATE, jobTitles: row.kind === 'unit' ? [{ nameAr: PLACEHOLDER_TITLE.ar, nameEn: PLACEHOLDER_TITLE.en, ...row.title }] : [] };
      // The sheet has no official code prefixes: a sample prefix from the English name, until HR sets the real ones. The sheet's top units were managed centrally, so they are shared.
      const top = parentId ? {} : { codePrefix: samplePrefix(row.en, prefixes), managementMode: 'shared' as const };
      created.set(`${level}:${row.ar}`, (await this.nodes.createNode(this.ctx, { ...input, ...top }, SEEDER_ID)).id);
    }
  }
}

/** Three capital letters from the English name that no other top unit has taken yet (STR, COR, EXE…). */
function samplePrefix(english: string, taken: Set<string>): string {
  const letters = english.toUpperCase().replace(/[^A-Z]/g, '');
  const candidates = Array.from({ length: Math.max(0, letters.length - 2) }, (_, shift) => letters.slice(shift, shift + 3));
  const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  const fallbacks = alphabet.flatMap((a) => alphabet.map((b) => `X${a}${b}`));
  const prefix = [...candidates, ...fallbacks].find((candidate) => !taken.has(candidate)) as string;
  taken.add(prefix);
  return prefix;
}
