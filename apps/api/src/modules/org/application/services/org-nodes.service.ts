import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  AddJobTitlesInput,
  CreateOrgNodeInput,
  JobTitleDto,
  MoveOrgNodeInput,
  OrgNodeDto,
  OrgTreeDto,
  UpdateJobTitleInput,
  UpdateOrgNodeInput,
} from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { EmployeePlacementPort } from '../../domain/contracts/employee-placement.port';
import { InvalidOrgHierarchyError, JobTitleInUseError, LastJobTitleError, OrgNodeInUseError } from '../../domain/errors/org.errors';
import type { LevelView, NodeView, TitleView } from '../../domain/types/org.types';
import { OrgRepository } from '../../domain/contracts/org.repository';
import { assertCompanyAccess, ORG_MANAGE, ORG_VIEW } from '../policies/org-access.policy';
import { toLevelDto, toNodeDto, toTitleDto } from '../transformers/org.transformer';
import { ORG_AUDIT } from '../messages/org.messages';

@Injectable()
export class OrgNodesService {
  constructor(
    private readonly repo: OrgRepository,
    private readonly employees: EmployeePlacementPort,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  async tree(ctx: AccessContext, companyId: string): Promise<OrgTreeDto> {
    assertCompanyAccess(ctx, ORG_VIEW, companyId);
    if (!(await this.repo.company(companyId))) throw new NotFoundError('Company', companyId);
    const [levels, nodes, unitCounts] = await Promise.all([this.repo.levels(companyId), this.repo.nodes(companyId), this.repo.unitCountsByLevel(companyId)]);
    return {
      companyId,
      levels: levels.map((l) => toLevelDto(l, unitCounts.get(l.id) ?? 0)),
      nodes: await this.nodeDtos(nodes),
    };
  }

  async createNode(ctx: AccessContext, input: CreateOrgNodeInput, actorId: string): Promise<OrgNodeDto> {
    const level = await this.mustLevel(input.levelId);
    assertCompanyAccess(ctx, ORG_MANAGE, level.companyId);
    await this.assertParent(level, input.parentId);
    if (input.managerId) await this.assertManager(input.managerId);
    this.assertTitlesFor(level, input.jobTitles.length);
    const id = await this.tx.run(async (tx) => {
      const nodeId = await this.repo.insertNode({ ...input, companyId: level.companyId, parentId: input.parentId, managerId: input.managerId ?? null, startDate: input.startDate, sortOrder: 0 }, tx);
      if (input.jobTitles.length) await this.repo.insertTitles(nodeId, input.jobTitles, tx);
      return nodeId;
    });
    this.audit(actorId, ORG_AUDIT.unitCreated, id, { levelId: level.id, parentId: input.parentId, startDate: input.startDate, jobTitles: input.jobTitles.length });
    return this.nodeDto(id);
  }

  async updateNode(ctx: AccessContext, id: string, input: UpdateOrgNodeInput, actorId: string): Promise<OrgNodeDto> {
    const node = await this.mustNode(id);
    assertCompanyAccess(ctx, ORG_MANAGE, node.companyId);
    if (input.managerId) await this.assertManager(input.managerId);
    await this.tx.run((tx) => this.repo.updateNode(id, { ...input, managerId: input.managerId ?? null }, tx));
    this.audit(actorId, ORG_AUDIT.unitUpdated, id, { isActive: input.isActive, startDate: input.startDate });
    return this.nodeDto(id);
  }

  async moveNode(ctx: AccessContext, id: string, input: MoveOrgNodeInput, actorId: string): Promise<OrgNodeDto> {
    const node = await this.mustNode(id);
    assertCompanyAccess(ctx, ORG_MANAGE, node.companyId);
    await this.assertParent(await this.mustLevel(node.levelId), input.parentId);
    if (input.parentId && (await this.repo.descendantIds([id])).includes(input.parentId)) {
      throw new InvalidOrgHierarchyError('A unit cannot be moved inside itself');
    }
    await this.tx.run((tx) => this.repo.moveNode(id, input.parentId, tx));
    this.audit(actorId, ORG_AUDIT.unitMoved, id, { parentId: input.parentId });
    return this.nodeDto(id);
  }

  /** A single unit can go only when empty; bulk removal happens through the levels change with confirmation. */
  async removeNode(ctx: AccessContext, id: string, actorId: string): Promise<void> {
    const node = await this.mustNode(id);
    assertCompanyAccess(ctx, ORG_MANAGE, node.companyId);
    const employees = (await this.employees.countByNodes([id])).get(id) ?? 0;
    if (employees > 0 || (await this.repo.childrenCount(id)) > 0) throw new OrgNodeInUseError();
    const titles = await this.repo.titlesOfNodes([id]);
    await this.tx.run(async (tx) => {
      await this.repo.softDeleteTitles(titles.map((t) => t.id), tx);
      await this.repo.softDeleteNodes([id], tx);
    });
    this.audit(actorId, ORG_AUDIT.unitDeleted, id, { jobTitles: titles.length });
  }

  async addTitles(ctx: AccessContext, nodeId: string, input: AddJobTitlesInput, actorId: string): Promise<JobTitleDto[]> {
    const node = await this.mustNode(nodeId);
    assertCompanyAccess(ctx, ORG_MANAGE, node.companyId);
    const level = await this.mustLevel(node.levelId);
    if (!level.isAssignable) throw new InvalidOrgHierarchyError('Job titles belong to units of an assignable level');
    const ids = await this.tx.run((tx) => this.repo.insertTitles(nodeId, input.jobTitles, tx));
    this.audit(actorId, ORG_AUDIT.jobTitleCreated, nodeId, { count: ids.length });
    return (await this.repo.titlesByIds(ids)).map((t) => toTitleDto(t, 0));
  }

  async updateTitle(ctx: AccessContext, id: string, input: UpdateJobTitleInput, actorId: string): Promise<JobTitleDto> {
    const title = await this.mustTitle(ctx, id);
    if (!input.isActive && title.isActive && (await this.repo.activeTitleCount(title.orgNodeId)) <= 1) throw new LastJobTitleError();
    await this.tx.run((tx) => this.repo.updateTitle(id, input, tx));
    this.audit(actorId, ORG_AUDIT.jobTitleUpdated, id, { isActive: input.isActive });
    const updated = (await this.repo.titlesByIds([id]))[0] as TitleView;
    return toTitleDto(updated, (await this.employees.countByTitles([id])).get(id) ?? 0);
  }

  async removeTitle(ctx: AccessContext, id: string, actorId: string): Promise<void> {
    const title = await this.mustTitle(ctx, id);
    if (((await this.employees.countByTitles([id])).get(id) ?? 0) > 0) throw new JobTitleInUseError();
    if (title.isActive && (await this.repo.activeTitleCount(title.orgNodeId)) <= 1) throw new LastJobTitleError();
    await this.tx.run((tx) => this.repo.softDeleteTitles([id], tx));
    this.audit(actorId, ORG_AUDIT.jobTitleDeleted, id, {});
  }

  // ------------------------------------------------------------------ helpers
  /** The first level has no parent; every other unit sits under a unit of the level right above its own. */
  private async assertParent(level: LevelView, parentId: string | null): Promise<void> {
    const levels = await this.repo.levels(level.companyId);
    const index = levels.findIndex((l) => l.id === level.id);
    if (index <= 0) {
      if (parentId) throw new InvalidOrgHierarchyError('Units of the first level have no parent');
      return;
    }
    const parent = parentId ? await this.repo.node(parentId) : null;
    if (!parent || parent.companyId !== level.companyId || parent.levelId !== levels[index - 1]?.id || !parent.isActive) {
      throw new InvalidOrgHierarchyError('The parent must be an active unit of the level right above');
    }
  }

  private assertTitlesFor(level: LevelView, count: number): void {
    if (level.isAssignable && count < 1) throw new InvalidOrgHierarchyError('Add at least one job title to this unit');
    if (!level.isAssignable && count > 0) throw new InvalidOrgHierarchyError('Job titles belong to units of an assignable level');
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

  private async mustTitle(ctx: AccessContext, id: string): Promise<TitleView> {
    const title = await this.repo.title(id);
    if (!title) throw new NotFoundError('Job title', id);
    assertCompanyAccess(ctx, ORG_MANAGE, (await this.mustNode(title.orgNodeId)).companyId);
    return title;
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
    return nodes.map((n) =>
      toNodeDto(n, {
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
