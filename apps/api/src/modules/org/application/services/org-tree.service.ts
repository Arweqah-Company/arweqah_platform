import { Injectable } from '@nestjs/common';
import type { ManagementMode, NoLeaderDto, OrgTreeDto, OrgTreeLeaderDto, OrgTreeNodeDto, OrgTreeQuery } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { todayInRiyadh } from '../../../../common/domain/riyadh-date';
import { EmployeePlacementPort } from '../../domain/contracts/employee-placement.port';
import { OrgLeaderRepository } from '../../domain/contracts/org-leader.repository';
import { OrgVersionRepository } from '../../domain/contracts/org-version.repository';
import { OrgRepository } from '../../domain/contracts/org.repository';
import { OrgViewFullRequiredError } from '../../domain/errors/org.errors';
import { effectiveModes, visibleUnitIds, type StaffByUnit } from '../../domain/rules/org-visibility.rules';
import type { NodeView } from '../../domain/types/org.types';
import { ORG_VIEW_FULL } from '../policies/org-access.policy';
import { toTitleDto } from '../transformers/org.transformer';
import { OrgLeadersService } from './org-leaders.service';
import { OrgLevelsService } from './org-levels.service';

interface TreeData {
  nodes: NodeView[];
  staff: StaffByUnit;
  modes: Map<string, ManagementMode>;
}

/** The units a company has, directly and under each unit. */
function subtreeTotals(nodes: readonly NodeView[], direct: ReadonlyMap<string, number>): Map<string, number> {
  const kids = new Map<string | null, string[]>();
  for (const n of nodes) kids.set(n.parentId, [...(kids.get(n.parentId) ?? []), n.id]);
  const totals = new Map<string, number>();
  const walk = (id: string): number => {
    const sum = (kids.get(id) ?? []).reduce((acc, child) => acc + walk(child), direct.get(id) ?? 0);
    totals.set(id, sum);
    return sum;
  };
  (kids.get(null) ?? []).forEach(walk);
  return totals;
}

interface TreeView {
  /** Null = every unit; otherwise the units to show. */
  shown: Set<string> | null;
  /** The units the compared company sees, when a company is compared. */
  compared: Set<string> | null;
  /** The company whose employees are counted; null = all companies. */
  company: string | null;
  noLeader: NoLeaderDto[];
  /** Units with a dated change waiting for its day. */
  scheduled: ReadonlySet<string>;
  /** The leaders and acting leaders in force, by unit. */
  leaders: ReadonlyMap<string, OrgTreeLeaderDto[]>;
}

/** What a unit says about itself, apart from the people and titles. */
const unitFields = (n: NodeView, effectiveMode: ManagementMode) => ({
  id: n.id,
  parentId: n.parentId,
  levelId: n.levelId,
  levelKey: n.levelKey,
  code: n.code,
  nameAr: n.nameAr,
  nameEn: n.nameEn,
  managementMode: n.managementMode,
  effectiveMode,
  isActive: n.isActive,
  startDate: n.startDate,
  managerId: n.managerId,
});

const sum = (counts: ReadonlyMap<string, number> | undefined): number => [...(counts?.values() ?? [])].reduce((a, b) => a + b, 0);

/**
 * The structure as one person may see it (plan 17.5): `team` is the viewer's own company, taken from the viewer; `full` and the
 * comparison with another company need `org.view_full`.
 */
@Injectable()
export class OrgTreeService {
  constructor(
    private readonly repo: OrgRepository,
    private readonly employees: EmployeePlacementPort,
    private readonly levels: OrgLevelsService,
    private readonly leaderRows: OrgLeaderRepository,
    private readonly leaders: OrgLeadersService,
    private readonly versions: OrgVersionRepository,
  ) {}

  async tree(ctx: AccessContext, query: OrgTreeQuery): Promise<OrgTreeDto> {
    const { full, canFull, company } = await this.audience(ctx, query);
    const data = await this.load();
    const noLeader = canFull ? await this.noLeader(data) : [];
    const nodes = await this.nodeDtos(data, {
      shown: full ? null : this.visibleTo(data, company),
      compared: query.asCompany ? this.visibleTo(data, query.asCompany) : null,
      company: full ? null : company,
      noLeader,
      scheduled: await this.versions.scheduledNodeIds(todayInRiyadh()),
      leaders: await this.leaders.currentByNode(),
    });
    const { levels, rules } = await this.levels.list();
    return { view: full ? 'full' : 'team', companyId: company, levels, rules, nodes, hiddenCount: data.nodes.length - nodes.length, noLeader };
  }

  /** Who is asking for what: the whole structure and the comparison need `org.view_full`; the team view is the viewer's own company. */
  private async audience(ctx: AccessContext, query: OrgTreeQuery): Promise<{ full: boolean; canFull: boolean; company: string | null }> {
    const full = query.view === 'full' || !!query.asCompany;
    const canFull = ctx.has(ORG_VIEW_FULL);
    if (full && !canFull) throw new OrgViewFullRequiredError();
    if (query.asCompany && !(await this.repo.company(query.asCompany))) throw new NotFoundError('Company', query.asCompany);
    return { full, canFull, company: full ? (query.asCompany ?? null) : ctx.placement.companyId };
  }

  private async load(): Promise<TreeData> {
    const [nodes, staff] = await Promise.all([this.repo.nodes(), this.employees.staffByUnitAndCompany()]);
    const modes = effectiveModes(nodes.map((n) => ({ id: n.id, parentId: n.parentId, mode: n.managementMode })));
    return { nodes, staff, modes };
  }

  private visibleTo(data: TreeData, company: string | null): Set<string> {
    if (!company) return new Set();
    return visibleUnitIds(data.nodes.map((n) => ({ id: n.id, parentId: n.parentId, mode: n.managementMode })), data.staff, company);
  }

  private async nodeDtos(data: TreeData, view: TreeView): Promise<OrgTreeNodeDto[]> {
    const nodes = data.nodes.filter((n) => !view.shown || view.shown.has(n.id));
    const titles = await this.repo.titlesOfNodes(nodes.map((n) => n.id));
    const [titleCounts, managers] = await Promise.all([
      this.employees.countByTitles(titles.map((t) => t.id)),
      this.employees.namesOf(nodes.flatMap((n) => (n.managerId ? [n.managerId] : []))),
    ]);
    const direct = new Map(data.nodes.map((n) => [n.id, view.company ? (data.staff.get(n.id)?.get(view.company) ?? 0) : sum(data.staff.get(n.id))]));
    const totals = subtreeTotals(data.nodes, direct);
    const lacking = new Set(view.noLeader.map((r) => r.nodeId));
    return nodes.map((n) => ({
      ...unitFields(n, data.modes.get(n.id) ?? 'per_company'),
      managerName: n.managerId ? (managers.get(n.managerId) ?? null) : null,
      staffCount: direct.get(n.id) ?? 0,
      subtreeStaffCount: totals.get(n.id) ?? 0,
      staffByCompany: view.company ? null : Object.fromEntries(data.staff.get(n.id) ?? []),
      titles: titles.filter((t) => t.orgNodeId === n.id).map((t) => toTitleDto(t, titleCounts.get(t.id) ?? 0)),
      visibleForCompany: view.compared ? view.compared.has(n.id) : null,
      hasNoLeader: lacking.has(n.id),
      hasScheduledChange: view.scheduled.has(n.id),
      leaders: view.leaders.get(n.id) ?? [],
    }));
  }

  /** Units managed per company where a company has employees directly and no leader row in force for that company (FR-100). */
  private async noLeader(data: TreeData): Promise<NoLeaderDto[]> {
    const led = new Set((await this.leaderRows.activeRows(todayInRiyadh())).filter((r) => r.kind === 'leader').map((r) => `${r.nodeId}|${r.companyId}`));
    return data.nodes
      .filter((n) => data.modes.get(n.id) === 'per_company')
      .flatMap((n) => [...(data.staff.get(n.id) ?? [])].filter(([company, count]) => count > 0 && !led.has(`${n.id}|${company}`)).map(([company]) => ({ nodeId: n.id, companyId: company })));
  }
}
