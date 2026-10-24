import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorePermission as P, type TaskDepartmentOptionDto, type TaskTagAdminDto, type TaskTagInput } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import { TaskDirectory } from '../../domain/contracts/task-directory.port';
import { TaskTagRepository } from '../../domain/contracts/task-tag.repository';
import { TaskDepartmentInvalidError, TaskTagInUseError, TaskTagNotFoundError } from '../../domain/errors/task.errors';
import type { TagRecord } from '../../domain/types/task.types';
import { TASK_AUDIT } from '../messages/task.messages';

/** Where a person's tag keys reach: a company, a set of departments, or everything (`nodeIds` null). Their own department is always included. */
interface TagReach {
  companyId: string | null;
  nodeIds: readonly string[] | null;
}

/** The tags each department keeps for its own tasks. A person works on the tags of the departments their key reaches. */
@Injectable()
export class TaskTagService {
  constructor(
    private readonly tags: TaskTagRepository,
    private readonly directory: TaskDirectory,
    private readonly org: OrgDirectoryService,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  async list(ctx: AccessContext): Promise<TaskTagAdminDto[]> {
    const reach = await this.reach(ctx, P.TasksTagsView);
    return this.withDepartments(await this.tags.list(reach.companyId, reach.nodeIds));
  }

  /** The departments the person may keep tags for (what the add-tag form offers). */
  async departments(ctx: AccessContext): Promise<TaskDepartmentOptionDto[]> {
    const reach = await this.reach(ctx, P.TasksTagCreate);
    const found = await this.tags.departments(reach.companyId, reach.nodeIds);
    const names = await this.org.describeNodes(found.map((d) => d.id));
    return found.map((d) => ({ id: d.id, nameAr: names.get(d.id)?.nameAr ?? '', nameEn: names.get(d.id)?.nameEn ?? '' })).sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'));
  }

  async create(ctx: AccessContext, input: TaskTagInput): Promise<TaskTagAdminDto> {
    await this.assertDepartmentInReach(ctx, P.TasksTagCreate, input.orgNodeId);
    const id = await this.tx.run((tx) => this.tags.insert(input, tx));
    this.audit(ctx.userId, TASK_AUDIT.tagCreated, id, { orgNodeId: input.orgNodeId });
    return this.one(id);
  }

  async update(ctx: AccessContext, id: string, input: TaskTagInput): Promise<TaskTagAdminDto> {
    const tag = await this.mustFind(ctx, id, P.TasksTagUpdate);
    if (input.orgNodeId !== tag.orgNodeId) throw new TaskDepartmentInvalidError();
    await this.tx.run((tx) => this.tags.update(id, input, tx));
    this.audit(ctx.userId, TASK_AUDIT.tagUpdated, id, { isActive: input.isActive });
    return this.one(id);
  }

  async remove(ctx: AccessContext, id: string): Promise<void> {
    const tag = await this.mustFind(ctx, id, P.TasksTagDelete);
    if (await this.tags.inUse(id)) throw new TaskTagInUseError();
    await this.tx.run((tx) => this.tags.remove(id, tx));
    this.audit(ctx.userId, TASK_AUDIT.tagRemoved, id, { orgNodeId: tag.orgNodeId });
  }

  private async reach(ctx: AccessContext, key: string): Promise<TagReach> {
    const scope = ctx.nodeScopeOf(key);
    if (scope.kind === 'all') return { companyId: null, nodeIds: null };
    if (scope.kind === 'company') return { companyId: scope.companyId, nodeIds: null };
    const own = (await this.directory.departmentOf(ctx.userId))?.nodeId;
    return { companyId: null, nodeIds: [...new Set([...(scope.kind === 'nodes' ? scope.ids : []), ...(own ? [own] : [])])] };
  }

  /** A department outside the person's reach is "not found"; a node that is not a department is a business error. */
  private async assertDepartmentInReach(ctx: AccessContext, key: string, nodeId: string): Promise<void> {
    const reach = await this.reach(ctx, key);
    const reachable = await this.tags.departments(reach.companyId, reach.nodeIds);
    if (reachable.some((d) => d.id === nodeId)) return;
    if (!(await this.tags.isDepartment(nodeId))) throw new TaskDepartmentInvalidError();
    throw new TaskTagNotFoundError();
  }

  private async mustFind(ctx: AccessContext, id: string, key: string): Promise<TagRecord> {
    const tag = await this.tags.find(id);
    if (!tag) throw new TaskTagNotFoundError();
    const reach = await this.reach(ctx, key);
    const reachable = await this.tags.departments(reach.companyId, reach.nodeIds);
    if (!reachable.some((d) => d.id === tag.orgNodeId)) throw new TaskTagNotFoundError();
    return tag;
  }

  private async one(id: string): Promise<TaskTagAdminDto> {
    return (await this.withDepartments([(await this.tags.find(id)) as TagRecord]))[0] as TaskTagAdminDto;
  }

  private async withDepartments(tags: TagRecord[]): Promise<TaskTagAdminDto[]> {
    const names = await this.org.describeNodes([...new Set(tags.map((t) => t.orgNodeId))]);
    return tags.map((t) => ({
      id: t.id,
      orgNodeId: t.orgNodeId,
      nameAr: t.nameAr,
      nameEn: t.nameEn,
      isActive: t.isActive,
      departmentNameAr: names.get(t.orgNodeId)?.nameAr ?? '',
      departmentNameEn: names.get(t.orgNodeId)?.nameEn ?? '',
    }));
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'task_tag', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
