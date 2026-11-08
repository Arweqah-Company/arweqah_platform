import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  DevelopmentStageRuleDto,
  ImportJobTitlesInput,
  JobTitleCardDto,
  JobTitleContentDto,
  JobTitleContentInput,
  JobTitlesPageDto,
  JobTitlesQuery,
  TitleCardQuery,
  TitleImportResultDto,
} from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { ORG_CHANGED } from '../../../../core/access/application/access.events';
import { JobTitleRolesService } from '../../../../core/access/application/job-title-roles.service';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { EmployeePlacementPort } from '../../domain/contracts/employee-placement.port';
import { JobTitleRepository } from '../../domain/contracts/job-title.repository';
import { OrgRepository } from '../../domain/contracts/org.repository';
import { GroupCompanyMissingError, OrgViewFullRequiredError } from '../../domain/errors/org.errors';
import { stageFor } from '../../domain/rules/development-stage.rules';
import { planTitleImport, type ImportContext, type RowPlan } from '../../domain/rules/title-import.rules';
import type { NodeView, TitleContent, TitleDetail } from '../../domain/types/org.types';
import { ORG_AUDIT } from '../messages/org.messages';
import { assertCompanyAccess, JOB_TITLES_IMPORT, ORG_TITLES_EDIT_CONTENT, ORG_VIEW_FULL } from '../policies/org-access.policy';
import { toCardDto, toListItemDto, toOccupants, toStageRuleDto } from '../transformers/job-title.transformer';
import { summarizeImport } from '../transformers/title-import.transformer';
import { OrgChainService } from './org-chain.service';
import { OrgVisibilityService } from './org-visibility.service';

/** The reporting line a row sets: its own code and the code it reports to (null clears it); nothing when the row leaves it alone. */
function reportingLineOf(plan: RowPlan): { code: string; reportsToCode: string | null } | null {
  if (plan.status === 'create' && plan.create.row.reportsToCode !== undefined) return { code: plan.code, reportsToCode: plan.create.row.reportsToCode };
  if (plan.status === 'update' && plan.update.row.reportsToCode !== undefined) return { code: plan.code, reportsToCode: plan.update.row.reportsToCode };
  return null;
}

const EMPTY_LIST = { ar: [], en: [] };
const EMPTY_CONTENT: TitleContent = { responsibilities: EMPTY_LIST, qualifications: EMPTY_LIST, kpis: EMPTY_LIST };

/** The job-titles page (FR-107): the list, the card with its manager chain, content edits, the stage rules and the file import (FR-104…FR-107). */
@Injectable()
export class JobTitlesService {
  constructor(
    private readonly repo: OrgRepository,
    private readonly titles: JobTitleRepository,
    private readonly employees: EmployeePlacementPort,
    private readonly visibility: OrgVisibilityService,
    private readonly chain: OrgChainService,
    private readonly titleRoles: JobTitleRolesService,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  /** The titles of the units the viewer sees, filtered and paged; the people counted are the viewer's company's, or every company's in the full view. */
  async list(ctx: AccessContext, query: JobTitlesQuery): Promise<JobTitlesPageDto> {
    const visible = await this.visibility.visibleNodeIds(ctx);
    const rows = await this.titles.list({
      search: query.search,
      visibleNodeIds: visible ? [...visible] : null,
      ancestorIds: [query.orgNodeId, query.sectorId, query.departmentId, query.sectionId].filter((id): id is string => !!id),
      grade: query.grade,
      track: query.track,
    });
    const holders = await this.employees.holdersByTitle();
    const company = ctx.has(ORG_VIEW_FULL) ? null : ctx.placement.companyId;
    const count = (id: string): number => [...(holders.get(id) ?? [])].filter(([c]) => !company || c === company).reduce((n, [, h]) => n + h.count, 0);
    const matching = rows.filter((r) => query.vacant === undefined || (count(r.id) === 0) === query.vacant);
    const page = matching.slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
    const paths = await this.repo.pathsOf([...new Set(page.map((r) => r.orgNodeId))]);
    return { items: page.map((r) => toListItemDto(r, paths.get(r.orgNodeId), count(r.id))), total: matching.length, page: query.page, pageSize: query.pageSize };
  }

  /** The card of a title (plan 17.8): its code parts, grade and track, development stage, reporting line, content, holders and the manager chain for a company. */
  async card(ctx: AccessContext, id: string, query: TitleCardQuery): Promise<JobTitleCardDto> {
    const title = await this.mustDetail(id);
    const node = await this.mustNode(title.orgNodeId);
    await this.visibility.assertVisible(ctx, node.id);
    const company = await this.cardCompany(ctx, query.company);
    const [rules, holders, companies, path, mode, up, chain] = await Promise.all([
      this.titles.stageRules(),
      this.employees.holdersByTitle(),
      this.repo.companies(),
      this.repo.pathsOf([node.id]),
      this.repo.effectiveModesOf([node.id]),
      title.reportsToTitleId ? this.repo.title(title.reportsToTitleId) : Promise.resolve(null),
      company ? this.chain.chainDto(id, company) : Promise.resolve(null),
    ]);
    const visibleCompany = (c: string): boolean => ctx.has(ORG_VIEW_FULL) || c === ctx.placement.companyId;
    const counts = new Map([...(holders.get(id) ?? [])].filter(([c]) => visibleCompany(c)).map(([c, h]) => [c, h.count] as const));
    const stage = title.grade !== null && title.track ? stageFor(rules, title.grade, title.track) : null;
    return toCardDto(title, node, { path: path.get(node.id), mode: mode.get(node.id) ?? 'per_company', up, chain, stage, occupants: toOccupants(counts, new Map(companies.map((c) => [c.id, c]))) });
  }

  /** The company a card's chain is walked for: the viewer's own, or another one only with the full view. */
  private async cardCompany(ctx: AccessContext, requested: string | undefined): Promise<string | null> {
    if (!requested) return ctx.placement.companyId;
    if (requested !== ctx.placement.companyId && !ctx.has(ORG_VIEW_FULL)) throw new OrgViewFullRequiredError();
    if (!(await this.repo.company(requested))) throw new NotFoundError('Company', requested);
    return requested;
  }

  /** Replaces the duties, qualifications and indicators of a title; the content version grows by one. */
  async updateContent(ctx: AccessContext, id: string, input: JobTitleContentInput, actorId: string): Promise<JobTitleContentDto> {
    const title = await this.mustDetail(id);
    const node = await this.mustNode(title.orgNodeId);
    assertCompanyAccess(ctx, ORG_TITLES_EDIT_CONTENT, node.companyId);
    const contentVersion = await this.tx.run((tx) => this.titles.setContent(id, input, tx));
    this.audit(actorId, ORG_AUDIT.jobTitleContentChanged, id, { contentVersion });
    return { ...input, contentVersion };
  }

  /** Who a title is (id, code, names), for the modules that hang content on it; a missing title is a 404. */
  async identity(id: string): Promise<{ id: string; code: string | null; nameAr: string; nameEn: string }> {
    const t = await this.mustDetail(id);
    return { id: t.id, code: t.code, nameAr: t.nameAr, nameEn: t.nameEn };
  }

  /** The stored rules of the development stage by grade and track (read only for now). */
  async stageRules(): Promise<DevelopmentStageRuleDto[]> {
    return (await this.titles.stageRules()).map(toStageRuleDto).filter((r): r is DevelopmentStageRuleDto => !!r).sort((a, b) => a.grade - b.grade || (a.track ?? '').localeCompare(b.track ?? ''));
  }

  // ------------------------------------------------------------------ import
  /** The titles file: a dry run reports what would happen; the real run does it in one transaction (rejected rows are skipped and reported). */
  async importTitles(ctx: AccessContext, input: ImportJobTitlesInput, actorId: string): Promise<TitleImportResultDto> {
    assertCompanyAccess(ctx, JOB_TITLES_IMPORT, await this.groupCompanyId());
    await this.titleRoles.assertTemplates(ctx, [input.templateRoleId]);
    if (input.dryRun) return summarizeImport(planTitleImport(input.rows, await this.importContext()), true);
    const plans = await this.tx.run(async (tx) => {
      await this.titles.lockCodes(tx);
      const planned = planTitleImport(input.rows, await this.importContext(tx));
      await this.apply(planned, input, tx);
      return planned;
    });
    const result = summarizeImport(plans, false);
    this.audit(actorId, ORG_AUDIT.jobTitlesImported, 'import', { created: result.created, updated: result.updated, unchanged: result.unchanged, rejected: result.rejected });
    await this.events.emitAsync(ORG_CHANGED);
    return result;
  }

  private async importContext(tx?: TransactionContext): Promise<ImportContext> {
    const [known, nodes, levels, issued] = await Promise.all([this.titles.knownTitles(), this.repo.nodes(), this.repo.levels(), this.titles.issuedCodes(tx)]);
    const accepting = new Set(levels.filter((l) => l.isAssignable).map((l) => l.id));
    const units = nodes.filter((n) => n.code && n.isActive).map((n) => [n.code as string, { id: n.id, acceptsTitles: accepting.has(n.levelId) }] as const);
    return { unitsByCode: new Map(units), titlesByCode: new Map(known.map((t) => [t.code, t])), issuedCodes: issued };
  }

  private async apply(plans: readonly RowPlan[], input: ImportJobTitlesInput, tx: TransactionContext): Promise<void> {
    const created = await this.createTitles(plans, input, tx);
    await this.updateTitles(plans, tx);
    const known = new Map((await this.titles.knownTitles()).map((t) => [t.code, t.id]));
    const idOf = (code: string): string | null => created.get(code) ?? known.get(code) ?? null;
    for (const plan of plans) {
      const line = reportingLineOf(plan);
      if (line && idOf(line.code)) await this.titles.setReportsTo(idOf(line.code) as string, line.reportsToCode ? idOf(line.reportsToCode) : null, tx);
    }
  }

  private async createTitles(plans: readonly RowPlan[], input: ImportJobTitlesInput, tx: TransactionContext): Promise<Map<string, string>> {
    const created = new Map<string, string>();
    for (const plan of plans) {
      if (plan.status !== 'create') continue;
      const { create } = plan;
      const [id] = await this.titles.insertTitles(create.unitId, [{ nameAr: create.row.nameAr, nameEn: create.row.nameEn, code: create.code, grade: create.grade, track: create.track, reportsToTitleId: null, content: create.row.content ?? EMPTY_CONTENT }], tx);
      await this.titleRoles.create([{ jobTitleId: id as string, nameAr: create.row.nameAr, nameEn: create.row.nameEn, ...(input.templateRoleId ? { templateRoleId: input.templateRoleId } : {}) }], tx);
      created.set(create.code, id as string);
    }
    return created;
  }

  private async updateTitles(plans: readonly RowPlan[], tx: TransactionContext): Promise<void> {
    const updates = plans.flatMap((p) => (p.status === 'update' ? [p.update] : []));
    const current = new Map((await this.repo.titlesByIds(updates.map((u) => u.existing.id))).map((t) => [t.id, t]));
    for (const { existing, row } of updates) {
      await this.repo.updateTitle(existing.id, { nameAr: row.nameAr, nameEn: row.nameEn, isActive: current.get(existing.id)?.isActive ?? true }, tx);
      await this.titleRoles.rename(existing.id, row, tx);
      if (row.content && JSON.stringify(row.content) !== JSON.stringify({ responsibilities: existing.responsibilities, qualifications: existing.qualifications, kpis: existing.kpis })) {
        await this.titles.setContent(existing.id, row.content, tx);
      }
    }
  }

  // ------------------------------------------------------------------ helpers
  private async groupCompanyId(): Promise<string> {
    const id = await this.repo.groupCompanyId();
    if (!id) throw new GroupCompanyMissingError();
    return id;
  }

  private async mustDetail(id: string): Promise<TitleDetail> {
    const title = await this.titles.detail(id);
    if (!title) throw new NotFoundError('Job title', id);
    return title;
  }

  private async mustNode(id: string): Promise<NodeView> {
    const node = await this.repo.node(id);
    if (!node) throw new NotFoundError('Unit', id);
    return node;
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    this.events.emit(AUDIT_EVENT, { actorId, action, entityType: 'org', entityId, changes } satisfies AuditEvent);
  }
}
