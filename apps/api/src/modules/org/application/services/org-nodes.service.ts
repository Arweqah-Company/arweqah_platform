import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ROOT_PARENT,
  UNIT_TYPE,
  type ChangeManagementModeInput,
  type ChangeManagementModeResultDto,
  type CreateJobTitlesInput,
  type CreateOrgNodeInput,
  type JobTitleDto,
  type JobTitleInput,
  type TitleTrack,
  type ManagementMode,
  type ManagementModeImpactDto,
  type MoveOrgNodeInput,
  type OrgNodeDto,
  type SetOrgNodeCodeInput,
  type UpdateJobTitleInput,
  type UpdateOrgNodeInput,
} from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { todayInRiyadh } from '../../../../common/domain/riyadh-date';
import { NotFoundError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { ACCESS_CHANGED, ORG_CHANGED } from '../../../../core/access/application/access.events';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { OrgNodeDependentsPort } from '../../domain/contracts/org-node-dependents.port';
import { EmployeePlacementPort } from '../../domain/contracts/employee-placement.port';
import {
  GroupCompanyMissingError,
  InvalidOrgHierarchyError,
  JobTitleCycleError,
  JobTitleGradeFrozenError,
  JobTitleInUseError,
  LastJobTitleError,
  OrgCodeAlreadySetError,
  OrgCodeTakenError,
  OrgModeRequiredError,
  OrgNodeHasTicketsError,
  OrgNodeInUseError,
} from '../../domain/errors/org.errors';
import { canCreateUnder } from '../../domain/rules/org-unit-types.rules';
import { effectiveModes } from '../../domain/rules/org-visibility.rules';
import type { LevelView, NodeView, TitleContent, TitleView } from '../../domain/types/org.types';
import { JobTitleRepository } from '../../domain/contracts/job-title.repository';
import { OrgRepository } from '../../domain/contracts/org.repository';
import { canSetGrade, createsCycle } from '../../domain/rules/job-title.rules';
import { assertCompanyAccess, JOB_TITLES_CREATE, JOB_TITLES_DELETE, JOB_TITLES_UPDATE, ORG_UNIT_CREATE, ORG_UNIT_DELETE, ORG_UNIT_MOVE, ORG_UNIT_SHARE, ORG_UNIT_UPDATE } from '../policies/org-access.policy';
import { toNodeDto, toTitleDto } from '../transformers/org.transformer';
import { JobTitleCodesService } from './job-title-codes.service';
import { OrgUnitCodesService } from './org-unit-codes.service';
import { OrgVersionsService } from './org-versions.service';
import { DEFAULT_VERSION_REASON, ORG_AUDIT } from '../messages/org.messages';
import { JobTitleRolesService } from '../../../../core/access/application/job-title-roles.service';
import { UserAccessService } from '../../../../core/access/application/user-access.service';
import type { TransactionContext } from '../../../../common/domain/transaction-context';

/** A title as it is written: the unit form's inline titles have no reporting line or content; a title added later may. */
type TitleToInsert = JobTitleInput & { reportsToTitleId?: string | null | undefined; content?: TitleContent | undefined };

const EMPTY_LIST = { ar: [], en: [] };
/** A title made without content starts empty. */
const EMPTY_TITLE_CONTENT: TitleContent = { responsibilities: EMPTY_LIST, qualifications: EMPTY_LIST, kpis: EMPTY_LIST };

@Injectable()
export class OrgNodesService {
  constructor(
    private readonly repo: OrgRepository,
    private readonly employees: EmployeePlacementPort,
    private readonly dependents: OrgNodeDependentsPort,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
    private readonly titleRoles: JobTitleRolesService,
    private readonly access: UserAccessService,
    private readonly codes: OrgUnitCodesService,
    private readonly versions: OrgVersionsService,
    private readonly jobTitles: JobTitleRepository,
    private readonly titleCodes: JobTitleCodesService,
  ) {}

  async createNode(ctx: AccessContext, input: CreateOrgNodeInput, actorId: string): Promise<OrgNodeDto> {
    const companyId = await this.groupCompanyId();
    assertCompanyAccess(ctx, ORG_UNIT_CREATE, companyId);
    const level = await this.mustLevel(input.levelId);
    const parent = await this.activeParent(input.parentId);
    await this.assertAllowedUnder(level, parent);
    this.assertModeGiven(level, parent, input.managementMode);
    if (input.managerId) await this.assertManager(input.managerId);
    this.assertTitlesFor(level, input.jobTitles.length);
    await this.titleRoles.assertTemplates(ctx, input.jobTitles.map((t) => t.templateRoleId));
    const id = await this.tx.run(async (tx) => {
      const code = await this.codes.next({ parent, level, prefix: input.codePrefix }, tx);
      const managementMode = input.managementMode ?? null;
      const nodeId = await this.repo.insertNode({ ...input, companyId, parentId: input.parentId, managerId: input.managerId ?? null, sortOrder: 0, code, managementMode }, tx);
      if (input.jobTitles.length) await this.insertTitlesWithRoles(nodeId, code, input.jobTitles, tx);
      return nodeId;
    });
    this.audit(actorId, ORG_AUDIT.unitCreated, id, { levelId: level.id, parentId: input.parentId, startDate: input.startDate, jobTitles: input.jobTitles.length, managementMode: input.managementMode ?? null });
    // The unit's head role is made by the refresh, so it runs before the manager is given it.
    await this.orgChanged();
    await this.followManagers(id, [input.managerId]);
    return this.nodeDto(id);
  }

  /**
   * Edits a unit. The name and the switch are dated (FR-99): a change that starts today is made now, a later one waits as a scheduled version (a unit is switched
   * off by a date this way); the manager and the start day apply at once. A change with no `effectiveFrom` starts today.
   */
  async updateNode(ctx: AccessContext, id: string, input: UpdateOrgNodeInput, actorId: string): Promise<OrgNodeDto> {
    const node = await this.mustNode(id);
    assertCompanyAccess(ctx, ORG_UNIT_UPDATE, node.companyId);
    if (input.managerId) await this.assertManager(input.managerId);
    const dated = node.nameAr !== input.nameAr || node.nameEn !== input.nameEn || node.isActive !== input.isActive;
    const when = { effectiveFrom: input.effectiveFrom ?? todayInRiyadh(), reason: input.reason ?? DEFAULT_VERSION_REASON, actorId };
    const appliedNow = await this.tx.run(async (tx) => {
      const applied = dated ? await this.versions.record(node, { nameAr: input.nameAr, nameEn: input.nameEn, isActive: input.isActive }, when, tx) : false;
      await this.repo.updateNode(id, { ...(dated && !applied ? node : input), managerId: input.managerId ?? null, startDate: input.startDate }, tx);
      return applied;
    });
    this.audit(actorId, ORG_AUDIT.unitUpdated, id, { isActive: input.isActive, startDate: input.startDate, ...(dated && { effectiveFrom: when.effectiveFrom, reason: when.reason }) });
    await this.afterUpdate(node, input, dated && !appliedNow);
    return this.nodeDto(id);
  }

  /** The head role follows a new manager or the unit being switched on or off now; a switch that waits for its day changes nothing yet. */
  private async afterUpdate(node: NodeView, input: UpdateOrgNodeInput, waits: boolean): Promise<void> {
    const activeNow = waits ? node.isActive : input.isActive;
    if ((input.managerId ?? null) !== node.managerId || activeNow !== node.isActive) await this.followManagers(node.id, [node.managerId, input.managerId]);
    await this.orgChanged();
  }

  async moveNode(ctx: AccessContext, id: string, input: MoveOrgNodeInput, actorId: string): Promise<OrgNodeDto> {
    const node = await this.mustNode(id);
    assertCompanyAccess(ctx, ORG_UNIT_MOVE, node.companyId);
    const parent = await this.activeParent(input.parentId);
    await this.assertAllowedUnder(await this.mustLevel(node.levelId), parent);
    if (!parent && !node.managementMode) throw new OrgModeRequiredError();
    if (parent && (await this.repo.descendantIds([id])).includes(parent.id)) {
      throw new InvalidOrgHierarchyError('A unit cannot be moved inside itself');
    }
    await this.assertNoTickets(id);
    await this.tx.run((tx) => this.repo.moveNode(id, input.parentId, tx));
    this.audit(actorId, ORG_AUDIT.unitMoved, id, { parentId: input.parentId });
    await this.orgChanged();
    return this.nodeDto(id);
  }

  /** A single unit can go only when empty; bulk removal happens through the levels change with confirmation. */
  async removeNode(ctx: AccessContext, id: string, actorId: string): Promise<void> {
    const node = await this.mustNode(id);
    assertCompanyAccess(ctx, ORG_UNIT_DELETE, node.companyId);
    const employees = (await this.employees.countByNodes([id])).get(id) ?? 0;
    if (employees > 0 || (await this.repo.childrenCount(id)) > 0) throw new OrgNodeInUseError();
    await this.assertNoTickets(id);
    const titles = await this.repo.titlesOfNodes([id]);
    await this.tx.run(async (tx) => {
      await this.titleRoles.remove(titles.map((t) => t.id), tx);
      await this.repo.softDeleteTitles(titles.map((t) => t.id), tx);
      await this.repo.softDeleteNodes([id], tx);
    });
    this.audit(actorId, ORG_AUDIT.unitDeleted, id, { jobTitles: titles.length });
    await this.followManagers(node.id, [node.managerId]);
    await this.orgChanged();
  }

  /** Gives a code to a unit that has none (every unit that existed before codes); once, and never changed by moving the unit. */
  async setCode(ctx: AccessContext, id: string, input: SetOrgNodeCodeInput, actorId: string): Promise<OrgNodeDto> {
    const node = await this.mustNode(id);
    assertCompanyAccess(ctx, ORG_UNIT_UPDATE, node.companyId);
    if (node.code) throw new OrgCodeAlreadySetError();
    await this.tx.run(async (tx) => {
      if (await this.repo.codeTaken(input.code, tx)) throw new OrgCodeTakenError();
      await this.repo.setNodeCode(id, input.code, tx);
      await this.titleCodes.fill(id, input.code, tx);
    });
    this.audit(actorId, ORG_AUDIT.unitCodeSet, id, { code: input.code });
    return this.nodeDto(id);
  }

  /** Changes how a unit (and what inherits from it) is managed. The impact is counted first and goes to the audit log with the reason. */
  async changeMode(ctx: AccessContext, id: string, input: ChangeManagementModeInput, actorId: string): Promise<ChangeManagementModeResultDto> {
    const node = await this.mustNode(id);
    assertCompanyAccess(ctx, ORG_UNIT_SHARE, node.companyId);
    if (!input.mode && (node.levelKey === UNIT_TYPE.Sector || !node.parentId)) throw new OrgModeRequiredError();
    const impact = await this.modeImpact(node, input.mode);
    await this.tx.run((tx) => this.repo.setNodeMode(id, input.mode, tx));
    this.audit(actorId, ORG_AUDIT.unitModeChanged, id, { from: node.managementMode, to: input.mode, reason: input.reason, ...impact });
    await this.orgChanged();
    return { node: await this.nodeDto(id), impact };
  }

  async addTitles(ctx: AccessContext, nodeId: string, input: CreateJobTitlesInput, actorId: string): Promise<JobTitleDto[]> {
    const node = await this.mustNode(nodeId);
    assertCompanyAccess(ctx, JOB_TITLES_CREATE, node.companyId);
    const level = await this.mustLevel(node.levelId);
    if (!level.isAssignable) throw new InvalidOrgHierarchyError('Job titles belong to units of a type that accepts them');
    await this.titleRoles.assertTemplates(ctx, input.jobTitles.map((t) => t.templateRoleId));
    await this.assertReportsTo(input.jobTitles.map((t) => t.reportsToTitleId));
    const ids = await this.tx.run((tx) => this.insertTitlesWithRoles(nodeId, node.code, input.jobTitles, tx));
    this.audit(actorId, ORG_AUDIT.jobTitleCreated, nodeId, { count: ids.length });
    await this.orgChanged();
    return (await this.repo.titlesByIds(ids)).map((t) => toTitleDto(t, 0));
  }

  async updateTitle(ctx: AccessContext, id: string, input: UpdateJobTitleInput, actorId: string): Promise<JobTitleDto> {
    const { title, node } = await this.mustTitle(ctx, id, JOB_TITLES_UPDATE);
    await this.assertTitleEditable(title, input);
    await this.tx.run((tx) => this.writeTitle(title, node, input, tx));
    this.audit(actorId, ORG_AUDIT.jobTitleUpdated, id, { isActive: input.isActive, grade: input.grade ?? null, track: input.track ?? null, reportsToTitleId: input.reportsToTitleId });
    if (input.reportsToTitleId !== undefined || input.grade !== undefined) await this.orgChanged();
    const updated = (await this.repo.titlesByIds([id]))[0] as TitleView;
    return toTitleDto(updated, (await this.employees.countByTitles([id])).get(id) ?? 0);
  }

  async removeTitle(ctx: AccessContext, id: string, actorId: string): Promise<void> {
    const { title } = await this.mustTitle(ctx, id, JOB_TITLES_DELETE);
    if (((await this.employees.countByTitles([id])).get(id) ?? 0) > 0) throw new JobTitleInUseError();
    if (title.isActive && (await this.repo.activeTitleCount(title.orgNodeId)) <= 1) throw new LastJobTitleError();
    await this.tx.run(async (tx) => {
      await this.titleRoles.remove([id], tx);
      await this.repo.softDeleteTitles([id], tx);
    });
    this.audit(actorId, ORG_AUDIT.jobTitleDeleted, id, {});
    await this.orgChanged();
  }

  // ------------------------------------------------------------------ helpers
  /** A department whose desk takes tickets, or that has open tickets, stays where it is (also when it sits below the unit). */
  private async assertNoTickets(id: string): Promise<void> {
    const ids = [id, ...(await this.repo.descendantIds([id]))];
    if ((await this.dependents.unitsInUse(ids)).length > 0) throw new OrgNodeHasTicketsError();
  }

  /** The unit goes under the group (null) or under an active unit; its type must be allowed there by the rules table. */
  private async assertAllowedUnder(level: LevelView, parent: NodeView | null): Promise<void> {
    const parentType = parent ? parent.levelKey : ROOT_PARENT;
    if (!canCreateUnder(await this.repo.levelRules(), parentType, level.key)) {
      throw new InvalidOrgHierarchyError(`A unit of type "${level.key}" cannot be placed under "${parentType}"`);
    }
  }

  private async activeParent(parentId: string | null): Promise<NodeView | null> {
    if (!parentId) return null;
    const parent = await this.repo.node(parentId);
    if (!parent || !parent.isActive) throw new InvalidOrgHierarchyError('The parent must be an active unit');
    return parent;
  }

  /** A sector and a unit directly under the group must choose a mode; elsewhere none means «inherit». */
  private assertModeGiven(level: LevelView, parent: NodeView | null, mode: ManagementMode | null | undefined): void {
    if ((level.key === UNIT_TYPE.Sector || !parent) && !mode) throw new OrgModeRequiredError();
  }

  /** What changing a unit's mode does: the units whose effective mode changes, and the employees of other companies in them (their manager is recomputed). */
  private async modeImpact(node: NodeView, mode: ManagementMode | null): Promise<ManagementModeImpactDto> {
    const [nodes, staff, groupCompany] = await Promise.all([this.repo.nodes(), this.employees.staffByUnitAndCompany(), this.groupCompanyId()]);
    const view = (override: boolean) => nodes.map((n) => ({ id: n.id, parentId: n.parentId, mode: override && n.id === node.id ? mode : n.managementMode }));
    const [before, after] = [effectiveModes(view(false)), effectiveModes(view(true))];
    const changed = nodes.filter((n) => before.get(n.id) !== after.get(n.id)).map((n) => n.id);
    const others = changed.flatMap((id) => [...(staff.get(id) ?? [])].filter(([company]) => company !== groupCompany).map(([, count]) => count));
    return { unitsAffected: changed.length, employeesOfOtherCompanies: others.reduce((a, b) => a + b, 0) };
  }

  private async groupCompanyId(): Promise<string> {
    const id = await this.repo.groupCompanyId();
    if (!id) throw new GroupCompanyMissingError();
    return id;
  }

  /** The unit tree changed: automatic roles follow, and so does what each person reaches (the units a unit-based scope covers). */
  private async orgChanged(): Promise<void> {
    await this.events.emitAsync(ORG_CHANGED);
    this.events.emit(ACCESS_CHANGED, {});
  }

  /** The head role of the unit goes to whoever manages it and is taken back from whoever no longer does (a person's choice to drop it later is kept until the unit's manager changes again). */
  private async followManagers(nodeId: string, employeeIds: (string | null | undefined)[]): Promise<void> {
    for (const employeeId of new Set(employeeIds.filter((id): id is string => !!id))) await this.access.syncHeadRole(nodeId, employeeId);
  }

  /**
   * Each new job title gets its own role in the same transaction, with the permissions of the chosen template, and its code when it has a grade and track
   * and the unit has a code. A title made together with its unit may leave the grade and track out (the code then waits).
   */
  private async insertTitlesWithRoles(nodeId: string, unitCode: string | null, titles: TitleToInsert[], tx: TransactionContext): Promise<string[]> {
    const codes = await this.titleCodes.assign(unitCode, titles, tx);
    const rows = titles.map((t, i) => ({
      nameAr: t.nameAr,
      nameEn: t.nameEn,
      code: codes[i] ?? null,
      grade: t.grade ?? null,
      track: t.track ?? null,
      reportsToTitleId: t.reportsToTitleId ?? null,
      content: t.content ?? EMPTY_TITLE_CONTENT,
    }));
    const ids = await this.jobTitles.insertTitles(nodeId, rows, tx);
    await this.titleRoles.create(titles.map((t, i) => ({ jobTitleId: ids[i] as string, nameAr: t.nameAr, nameEn: t.nameEn, templateRoleId: t.templateRoleId })), tx);
    return ids;
  }

  /** The last title of a unit stays on, a grade and track are set once, and the reporting line never loops. */
  private async assertTitleEditable(title: TitleView, input: UpdateJobTitleInput): Promise<void> {
    if (!input.isActive && title.isActive && (await this.repo.activeTitleCount(title.orgNodeId)) <= 1) throw new LastJobTitleError();
    if (!canSetGrade(title, input)) throw new JobTitleGradeFrozenError();
    if (input.reportsToTitleId) await this.assertReportingLine(title.id, input.reportsToTitleId);
  }

  private async writeTitle(title: TitleView, node: NodeView, input: UpdateJobTitleInput, tx: TransactionContext): Promise<void> {
    await this.repo.updateTitle(title.id, input, tx);
    await this.titleRoles.rename(title.id, input, tx);
    if (input.grade !== undefined && input.track) await this.giveGrade(title.id, node.code, { grade: input.grade, track: input.track }, tx);
    if (input.reportsToTitleId !== undefined) await this.jobTitles.setReportsTo(title.id, input.reportsToTitleId, tx);
  }

  /** The grade and track of a title that has none: its code is built now, or when its unit gets one. */
  private async giveGrade(titleId: string, unitCode: string | null, gradeAndTrack: { grade: number; track: TitleTrack }, tx: TransactionContext): Promise<void> {
    const [code] = await this.titleCodes.assign(unitCode, [gradeAndTrack], tx);
    await this.jobTitles.setGradeAndCode(titleId, { ...gradeAndTrack, code: code ?? null }, tx);
  }

  /** The titles a new title reports to must exist (a new title cannot make a loop). */
  private async assertReportsTo(ids: (string | null | undefined)[]): Promise<void> {
    const wanted = [...new Set(ids.filter((id): id is string => !!id))];
    if (!wanted.length) return;
    const found = new Set((await this.repo.titlesByIds(wanted)).map((t) => t.id));
    const missing = wanted.find((id) => !found.has(id));
    if (missing) throw new NotFoundError('Job title', missing);
  }

  /** A title reports to an existing title and never to itself or to a title below it. */
  private async assertReportingLine(id: string, upId: string): Promise<void> {
    await this.assertReportsTo([upId]);
    const lines = new Map((await this.jobTitles.reportingLines()).map((l) => [l.id, l.upId]));
    if (createsCycle(lines, id, upId)) throw new JobTitleCycleError();
  }

  /** Titles are optional, and only a type that accepts them (never a sector) may have any. */
  private assertTitlesFor(level: LevelView, count: number): void {
    if (!level.isAssignable && count > 0) throw new InvalidOrgHierarchyError('Job titles belong to units of a type that accepts them');
  }

  /** The manager may belong to another company (a warning in the UI, not a block); the employee must exist. */
  private async assertManager(managerId: string): Promise<void> {
    if (!(await this.employees.exists(managerId))) throw new NotFoundError('Employee', managerId);
  }

  private async mustLevel(id: string): Promise<LevelView> {
    const level = await this.repo.level(id);
    if (!level) throw new NotFoundError('Level', id);
    return level;
  }

  private async mustNode(id: string): Promise<NodeView> {
    const node = await this.repo.node(id);
    if (!node) throw new NotFoundError('Unit', id);
    return node;
  }

  private async mustTitle(ctx: AccessContext, id: string, key: string): Promise<{ title: TitleView; node: NodeView }> {
    const title = await this.repo.title(id);
    if (!title) throw new NotFoundError('Job title', id);
    const node = await this.mustNode(title.orgNodeId);
    assertCompanyAccess(ctx, key, node.companyId);
    return { title, node };
  }

  private async nodeDto(id: string): Promise<OrgNodeDto> {
    const node = await this.mustNode(id);
    return (await this.nodeDtos([node]))[0] as OrgNodeDto;
  }

  private async nodeDtos(nodes: NodeView[]): Promise<OrgNodeDto[]> {
    const ids = nodes.map((n) => n.id);
    const [paths, titles, nodeCounts] = await Promise.all([this.repo.pathsOf(ids), this.repo.titlesOfNodes(ids), this.employees.countByNodes(ids)]);
    const titleCounts = await this.employees.countByTitles(titles.map((t) => t.id));
    const managers = await this.employees.namesOf(nodes.flatMap((n) => (n.managerId ? [n.managerId] : [])));
    const modes = await this.repo.effectiveModesOf(ids);
    return nodes.map((n) =>
      toNodeDto(n, {
        effectiveMode: modes.get(n.id) ?? 'per_company',
        path: paths.get(n.id),
        managerName: n.managerId ? (managers.get(n.managerId) ?? null) : null,
        employeesCount: nodeCounts.get(n.id) ?? 0,
        titles: titles.filter((t) => t.orgNodeId === n.id).map((t) => toTitleDto(t, titleCounts.get(t.id) ?? 0)),
      }),
    );
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'org', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
