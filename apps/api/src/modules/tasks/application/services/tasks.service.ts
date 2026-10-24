import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorePermission as P, riyadhToday, type CreateTaskInput, type TaskDto, type TaskFormOptionsDto, type TaskPersonDto, type UpdateTaskInput } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { ForbiddenError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { TaskDirectory } from '../../domain/contracts/task-directory.port';
import { TaskTagRepository } from '../../domain/contracts/task-tag.repository';
import { TaskTicketParticipants } from '../../domain/contracts/task-ticket-participants.port';
import { TaskRepository } from '../../domain/contracts/task.repository';
import { TaskAssigneeInvalidError, TaskAssignmentNotAllowedError, TaskDueDateInvalidError, TaskRevisionConflictError, TaskTagInvalidError } from '../../domain/errors/task.errors';
import { decideAssignment } from '../../domain/rules/task-assignment.rules';
import { inReach } from '../../domain/rules/task-reach.rules';
import type { TaskPatch, TaskPerson, TaskRow, TaskViewer } from '../../domain/types/task.types';
import { TASK_AUDIT } from '../messages/task.messages';
import { TaskAccessPolicy } from '../policies/task-access.policy';
import { TaskTransformer } from '../transformers/task.transformer';
import { TaskApprovalService } from './task-approval.service';
import { TaskNotifier } from './task-notifier.service';
import { TaskPolicyService } from './task-policy.service';

/** The columns of a task anybody with the update key may edit as they are (the rest have rules of their own). */
const EDITABLE_FIELDS = ['title', 'description', 'dueDate', 'priority', 'estimateMinutes'] as const;

interface Pair {
  creator: TaskPerson;
  assignee: TaskPerson;
}

/** Creating, reading and editing tasks, and following them. Moving a task between statuses is TaskTransitionService. */
@Injectable()
export class TasksService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly directory: TaskDirectory,
    private readonly tags: TaskTagRepository,
    private readonly ticketPeers: TaskTicketParticipants,
    private readonly access: TaskAccessPolicy,
    private readonly transformer: TaskTransformer,
    private readonly policies: TaskPolicyService,
    private readonly notifier: TaskNotifier,
    private readonly approvals: TaskApprovalService,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async create(viewer: TaskViewer, input: CreateTaskInput): Promise<TaskDto> {
    const today = riyadhToday(this.clock.now());
    const pair = await this.pair(viewer.userId, input.assigneeUserId ?? viewer.userId);
    await this.assertMayAssign(viewer, pair);
    const dueDate = input.dueDate ?? today;
    if (dueDate < today) throw new TaskDueDateInvalidError();
    await this.assertTagUsable(input.tagId ?? null, pair);
    const selfAssigned = pair.creator.userId === pair.assignee.userId;
    const approverUserId = selfAssigned ? pair.creator.managerUserId : null;
    const reviewerUserId = input.needsReview ? this.reviewerFor(pair, approverUserId) : null;
    const id = await this.tx.run(async (tx) => {
      const taskId = await this.tasks.insert(
        {
          companyId: pair.creator.companyId as string, title: input.title, description: input.description, assigneeUserId: pair.assignee.userId, creatorUserId: pair.creator.userId,
          reviewerUserId, approverUserId, status: approverUserId ? 'pending_approval' : 'todo', priority: input.priority, dueDate, estimateMinutes: input.estimateMinutes ?? null,
          tagId: input.tagId ?? null, urgentManual: input.urgent, needsReview: reviewerUserId !== null, recurrence: input.recurrence, recurrenceEnd: input.recurrenceEnd ?? null,
          recurrenceParentId: null, source: 'standalone', ticketId: null, projectId: null,
        },
        tx,
      );
      await this.tasks.appendEvent({ taskId, type: 'created', actorUserId: viewer.userId, toStatus: approverUserId ? 'pending_approval' : 'todo' }, tx);
      if (approverUserId) await this.approvals.begin(taskId, viewer.userId, tx);
      const row = (await this.tasks.find(taskId, viewer.userId, tx)) as TaskRow;
      await this.notifier.send({ kind: 'assigned', task: row, recipients: [pair.assignee.userId], actorUserId: viewer.userId, tx });
      await this.notifier.send({ kind: 'approvalRequested', task: row, recipients: [approverUserId], actorUserId: viewer.userId, tx });
      return taskId;
    });
    this.audit(viewer.userId, TASK_AUDIT.created, id, { assigneeUserId: pair.assignee.userId, priority: input.priority, selfAssigned });
    return this.get(viewer, id);
  }

  /** Throws unless the viewer may give a task to this person (the same rules as creating one). */
  async assertMayGiveTo(viewer: TaskViewer, assigneeUserId: string): Promise<void> {
    await this.assertMayAssign(viewer, await this.pair(viewer.userId, assigneeUserId));
  }

  async get(viewer: TaskViewer, id: string): Promise<TaskDto> {
    const row = await this.tasks.find(id, viewer.userId);
    this.access.assertCanView(viewer, row);
    return this.detail(viewer, row as TaskRow);
  }

  /** The detail of a task the viewer may see: history, objection, and what they can do with it. */
  async detail(viewer: TaskViewer, row: TaskRow): Promise<TaskDto> {
    const [events, objection, policy] = await Promise.all([this.tasks.events(row.id), this.tasks.openObjection(row.id), this.policies.forCompany(row.companyId)]);
    const now = this.clock.now();
    return this.transformer.toDetail({ row, policy, today: riyadhToday(now), now, events, objection, abilities: this.access.abilities(viewer, row) });
  }

  async update(viewer: TaskViewer, id: string, input: UpdateTaskInput): Promise<TaskDto> {
    const row = await this.tasks.find(id, viewer.userId);
    this.access.assertCanView(viewer, row);
    const task = row as TaskRow;
    if (!this.access.abilities(viewer, task).edit) throw new ForbiddenError();
    const patch = await this.patchFrom(task, input);
    await this.tx.run(async (tx) => {
      if (!(await this.tasks.patch(id, input.revision, { ...patch, lastActivityAt: this.clock.now() }, tx))) throw new TaskRevisionConflictError();
      await this.tasks.appendEvent({ taskId: id, type: 'updated', actorUserId: viewer.userId, note: Object.keys(patch).join(',') }, tx);
    });
    this.audit(viewer.userId, TASK_AUDIT.updated, id, { fields: Object.keys(patch) });
    return this.get(viewer, id);
  }

  async follow(viewer: TaskViewer, id: string, on: boolean): Promise<TaskDto> {
    this.access.assertCanView(viewer, await this.tasks.find(id, viewer.userId));
    if (on) await this.tasks.follow(id, viewer.userId);
    else await this.tasks.unfollow(id, viewer.userId);
    return this.get(viewer, id);
  }

  /** What the new-task form shows: who the viewer may give a task to, their department's tags, and who approves a task for themselves. */
  async formOptions(viewer: TaskViewer, search?: string): Promise<TaskFormOptionsDto> {
    const me = await this.directory.person(viewer.userId);
    if (!me) throw new TaskAssigneeInvalidError();
    const department = await this.directory.departmentOf(viewer.userId);
    const tags = department ? await this.tags.list(me.companyId, [department.nodeId]) : [];
    return {
      assignees: (await this.assigneeChoices(viewer, me, department?.managerUserId ?? null, search)).map((p) => ({ id: p.userId, name: p.name, isSelf: p.userId === viewer.userId })),
      tags: tags.filter((t) => t.isActive).map((t) => this.transformer.tagRecord(t)),
      approver: await this.approverOf(me),
    };
  }

  /** The viewer, the manager of their department, and the people their assign key reaches (each once). */
  private async assigneeChoices(viewer: TaskViewer, me: TaskPerson, departmentManagerId: string | null, search?: string): Promise<TaskPerson[]> {
    const candidates = await this.directory.assignCandidates(viewer, viewer.scopes[P.TasksAssign] ?? null, search);
    const manager = departmentManagerId && departmentManagerId !== me.userId ? await this.directory.person(departmentManagerId) : null;
    const byId = new Map<string, TaskPerson>([[me.userId, me]]);
    for (const person of [manager, ...candidates]) if (person) byId.set(person.userId, person);
    return [...byId.values()];
  }

  private async approverOf(me: TaskPerson): Promise<TaskPersonDto | null> {
    if (!me.managerUserId) return null;
    const manager = (await this.directory.people([me.managerUserId])).get(me.managerUserId);
    return manager ? { id: manager.userId, name: manager.name } : null;
  }

  // -------------------------------------------------------------------- helpers

  private async pair(creatorId: string, assigneeId: string): Promise<Pair> {
    const people = await this.directory.people([...new Set([creatorId, assigneeId])]);
    const creator = people.get(creatorId);
    const assignee = people.get(assigneeId);
    if (!creator || !assignee || !creator.companyId || creator.companyId !== assignee.companyId) throw new TaskAssigneeInvalidError();
    return { creator, assignee };
  }

  /** The rules of who may give a task to whom; people on one ticket are asked last because it costs a query. */
  private async assertMayAssign(viewer: TaskViewer, { creator, assignee }: Pair): Promise<void> {
    const department = await this.directory.departmentOf(creator.userId);
    const base = {
      creatorUserId: creator.userId,
      assigneeUserId: assignee.userId,
      inAssignReach: creator.userId !== assignee.userId && inReach(viewer.scopes[P.TasksAssign] ?? null, viewer, assignee),
      isCreatorsDepartmentManager: department?.managerUserId === assignee.userId,
      shareTicket: false,
      isProjectMember: false,
    };
    const first = decideAssignment(base);
    const decision = first.allowed ? first : decideAssignment({ ...base, shareTicket: await this.ticketPeers.shareOpenTicket(creator.userId, assignee.userId) });
    if (!decision.allowed) throw new TaskAssignmentNotAllowedError();
  }

  /** A tag must be active, of the same company, and kept by the department of the one who gives or the one who receives. */
  private async assertTagUsable(tagId: string | null, { creator, assignee }: Pair): Promise<void> {
    if (!tagId) return;
    const tag = await this.tags.find(tagId);
    if (!tag || !tag.isActive || tag.companyId !== creator.companyId) throw new TaskTagInvalidError();
    const departments = await Promise.all([this.directory.departmentOf(creator.userId), this.directory.departmentOf(assignee.userId)]);
    if (!departments.some((d) => d?.nodeId === tag.orgNodeId)) throw new TaskTagInvalidError();
  }

  /** Who accepts a task that needs review: who gave it; for a task given to oneself, whoever approves it (nobody = no review). */
  private reviewerFor({ creator, assignee }: Pair, approverUserId: string | null): string | null {
    return creator.userId === assignee.userId ? approverUserId : creator.userId;
  }

  private async patchFrom(task: TaskRow, input: UpdateTaskInput): Promise<TaskPatch> {
    const patch: TaskPatch = {};
    for (const key of EDITABLE_FIELDS) if (input[key] !== undefined) Object.assign(patch, { [key]: input[key] });
    if (input.dueDate !== undefined && input.dueDate !== task.dueDate) Object.assign(patch, { remindedAt: null, overdueNotifiedAt: null });
    if (input.urgent !== undefined) patch.urgentManual = input.urgent;
    if (input.tagId !== undefined) {
      await this.assertTagUsable(input.tagId, await this.pair(task.creatorUserId, task.assigneeUserId));
      patch.tagId = input.tagId;
    }
    if (input.needsReview !== undefined) Object.assign(patch, this.reviewPatch(task, input.needsReview));
    return patch;
  }

  /** Turning review on needs somebody to review: the reviewer already named, else who gave the task, else whoever approved it. */
  private reviewPatch(task: TaskRow, needsReview: boolean): Pick<TaskPatch, 'needsReview' | 'reviewerUserId'> {
    const given = task.creatorUserId !== task.assigneeUserId ? task.creatorUserId : task.approverUserId;
    const reviewer = needsReview ? (task.reviewerUserId ?? given) : null;
    return { needsReview: reviewer !== null, reviewerUserId: reviewer };
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'task', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
