import { Injectable } from '@nestjs/common';
import type { ManagementMode, TitleChainDto, TitleChainStepDto } from '@arweqah-platform/shared';
import { EmployeePlacementPort, type TitleHolders } from '../../domain/contracts/employee-placement.port';
import { JobTitleRepository, type TitleLink } from '../../domain/contracts/job-title.repository';
import { OrgRepository } from '../../domain/contracts/org.repository';
import { GroupCompanyMissingError } from '../../domain/errors/org.errors';
import { holdersCompany, resolveManagerChain, type ChainResult, type ChainStep, type ChainTitle } from '../../domain/rules/org-manager-chain.rules';
import type { NodeView, TitleView } from '../../domain/types/org.types';
import { effectiveModes } from '../../domain/rules/org-visibility.rules';

type HoldersMap = Map<string, Map<string, TitleHolders>>;

/** What the chain needs: every live title as a link with its unit's mode and holders, the holders themselves, and the group company. */
export interface ChainData {
  titles: Map<string, ChainTitle>;
  holders: HoldersMap;
  /** The unit each title sits in. */
  nodeOf: Map<string, string>;
  modeOfNode: Map<string, ManagementMode>;
  groupCompanyId: string;
}

/** What the reporting line gives an employee: the person (or nobody) and the manager in force today. */
export interface ChainManager {
  managerId: string | null;
  currentManagerId: string | null;
}

/**
 * The manager of an employee from the reporting line of job titles (plan 11.4, decision Q14): the nearest title above that somebody holds, never leaving
 * the employee's company inside a unit managed per company. The employees module applies it; the title card shows it.
 */
@Injectable()
export class OrgChainService {
  constructor(
    private readonly repo: OrgRepository,
    private readonly jobTitles: JobTitleRepository,
    private readonly employees: EmployeePlacementPort,
  ) {}

  async load(known?: TitleLink[]): Promise<ChainData> {
    const [links, nodes, holders, groupCompanyId] = await Promise.all([known ?? this.jobTitles.reportingLines(), this.repo.nodes(), this.employees.holdersByTitle(), this.repo.groupCompanyId()]);
    if (!groupCompanyId) throw new GroupCompanyMissingError();
    const modes = effectiveModes(nodes.map((n) => ({ id: n.id, parentId: n.parentId, mode: n.managementMode })));
    const titles = new Map<string, ChainTitle>(links.map((l) => [l.id, { id: l.id, upId: l.upId, mode: modes.get(l.nodeId) ?? 'per_company', holders: countsOf(holders.get(l.id)) }]));
    return { titles, holders, nodeOf: new Map(links.map((l) => [l.id, l.nodeId])), modeOfNode: modes, groupCompanyId };
  }

  /** The manager each employee placed in a title that has a reporting line should have: a person, or null when nobody above holds a title. Others are left out. */
  async managersForPlaced(): Promise<Map<string, ChainManager>> {
    const links = await this.jobTitles.reportingLines();
    if (!links.some((l) => l.upId)) return new Map();
    const data = await this.load(links);
    const withLine = links.filter((l) => l.upId).map((l) => l.id);
    const result = new Map<string, ChainManager>();
    for (const person of await this.employees.placedEmployees(withLine)) {
      const chain = resolveManagerChain(data.titles, { titleId: person.titleId, company: person.companyId, groupCompany: data.groupCompanyId });
      result.set(person.id, { managerId: this.holderOf(data, chain, person), currentManagerId: person.managerId });
    }
    return result;
  }

  /** The chain from a title for people of `company`, with the titles named by the caller's `describe`. */
  async chainOf(titleId: string, company: string, data?: ChainData): Promise<{ result: ChainResult; data: ChainData }> {
    const loaded = data ?? (await this.load());
    return { result: resolveManagerChain(loaded.titles, { titleId, company, groupCompany: loaded.groupCompanyId }), data: loaded };
  }

  /** The step list of a chain for the card, with each title's names and, for the one found, the person. */
  async chainDto(titleId: string, company: string): Promise<TitleChainDto> {
    const { result, data } = await this.chainOf(titleId, company);
    const [titles, nodes] = await Promise.all([this.repo.titlesByIds(result.steps.map((s) => s.titleId)), this.repo.nodes()]);
    const byTitle = new Map(titles.map((t) => [t.id, t]));
    const byNode = new Map(nodes.map((n) => [n.id, n]));
    const startPerCompany = data.titles.get(titleId)?.mode === 'per_company';
    const steps = result.steps.map((step): TitleChainStepDto => {
      const title = byTitle.get(step.titleId);
      const holder = this.holderIn(data, step, { startPerCompany, company });
      return { id: step.titleId, ...stepNames(title, title ? byNode.get(title.orgNodeId) : undefined), state: step.state, count: step.count ?? null, ...holderIds(holder) };
    });
    return { companyId: company, managerTitleId: result.managerTitleId, steps };
  }

  /** The first holder of a found step, in the company the search used. */
  private holderIn(data: ChainData, step: ChainStep, from: { startPerCompany: boolean; company: string }): TitleHolders | undefined {
    if (step.state !== 'found') return undefined;
    const lookup = holdersCompany(from.startPerCompany, data.titles.get(step.titleId)?.mode ?? 'per_company', { company: from.company, groupCompany: data.groupCompanyId });
    return data.holders.get(step.titleId)?.get(lookup);
  }

  /** The first holder of the manager title in the company the search used; null when none. */
  private holderOf(data: ChainData, chain: ChainResult, person: { companyId: string; titleId: string }): string | null {
    if (!chain.managerTitleId) return null;
    const start = data.titles.get(person.titleId);
    const found = data.titles.get(chain.managerTitleId);
    if (!start || !found) return null;
    const company = holdersCompany(start.mode === 'per_company', found.mode, { company: person.companyId, groupCompany: data.groupCompanyId });
    return data.holders.get(chain.managerTitleId)?.get(company)?.firstId ?? null;
  }
}

const holderIds = (holder: TitleHolders | undefined): Pick<TitleChainStepDto, 'managerEmployeeId' | 'managerName'> => ({ managerEmployeeId: holder?.firstId ?? null, managerName: holder?.firstName ?? null });

const NO_TITLE = { code: null, nameAr: '', nameEn: '' };
const NO_UNIT = { nameAr: '', nameEn: '' };

function stepNames(title: TitleView | undefined, unit: NodeView | undefined): Pick<TitleChainStepDto, 'code' | 'nameAr' | 'nameEn' | 'unitNameAr' | 'unitNameEn'> {
  const t = title ?? NO_TITLE;
  const u = unit ?? NO_UNIT;
  return { code: t.code, nameAr: t.nameAr, nameEn: t.nameEn, unitNameAr: u.nameAr, unitNameEn: u.nameEn };
}

const countsOf = (byCompany: Map<string, TitleHolders> | undefined): Record<string, number> => Object.fromEntries([...(byCompany ?? [])].map(([company, h]) => [company, h.count]));
