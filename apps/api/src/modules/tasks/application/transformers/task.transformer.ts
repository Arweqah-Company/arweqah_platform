import { Injectable } from '@nestjs/common';
import { formatTaskNumber, type TaskAbilitiesDto, type TaskDto, type TaskEventDto, type TaskListItemDto, type TaskObjectionDto, type TaskPersonDto, type TaskTagDto } from '@arweqah-platform/shared';
import { flagsOf } from '../../domain/rules/task-flags.rules';
import type { PolicyRecord, TagRecord, TaskEventRow, TaskObjectionRow, TaskRow } from '../../domain/types/task.types';

const person = (id: string, name: string): TaskPersonDto => ({ id, name });
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

/** Task rows → the shapes the API returns. Pure: the flags are computed here from the data and the company's policy. */
@Injectable()
export class TaskTransformer {
  tag(r: Pick<TaskRow, 'tagId' | 'tagNameAr' | 'tagNameEn' | 'tagOrgNodeId' | 'tagIsActive'>): TaskTagDto | null {
    return r.tagId ? { id: r.tagId, orgNodeId: r.tagOrgNodeId as string, nameAr: r.tagNameAr as string, nameEn: r.tagNameEn as string, isActive: r.tagIsActive ?? true } : null;
  }

  tagRecord(t: TagRecord): TaskTagDto {
    return { id: t.id, orgNodeId: t.orgNodeId, nameAr: t.nameAr, nameEn: t.nameEn, isActive: t.isActive };
  }

  toListItem(r: TaskRow, policy: PolicyRecord, today: string, now: Date): TaskListItemDto {
    return {
      id: r.id,
      number: formatTaskNumber(r.number),
      title: r.title,
      status: r.status,
      priority: r.priority,
      dueDate: r.dueDate,
      estimateMinutes: r.estimateMinutes,
      assignee: person(r.assigneeUserId, r.assigneeName),
      creator: person(r.creatorUserId, r.creatorName),
      tag: this.tag(r),
      flags: flagsOf(r, policy, today, now),
      needsReview: r.needsReview,
      source: r.source,
      archivedAt: iso(r.archivedAt),
      revision: r.revision,
    };
  }

  toDetail(input: { row: TaskRow; policy: PolicyRecord; today: string; now: Date; events: TaskEventRow[]; objection: TaskObjectionRow | null; abilities: TaskAbilitiesDto }): TaskDto {
    const { row: r } = input;
    return {
      ...this.toListItem(r, input.policy, input.today, input.now),
      description: r.description,
      urgentMarked: r.urgentManual,
      reviewer: r.reviewerUserId ? person(r.reviewerUserId, r.reviewerName ?? '') : null,
      approver: r.approverUserId ? person(r.approverUserId, r.approverName ?? '') : null,
      recurrence: r.recurrence,
      recurrenceEnd: r.recurrenceEnd,
      completedAt: iso(r.completedAt),
      loggedMinutes: r.loggedMinutes,
      isFollowing: r.isFollowing,
      followers: r.followers,
      objection: input.objection ? this.objection(input.objection) : null,
      events: input.events.map((e) => this.event(e)),
      abilities: input.abilities,
    };
  }

  private event(e: TaskEventRow): TaskEventDto {
    return { id: e.id, type: e.type, actor: e.actorUserId ? person(e.actorUserId, e.actorName ?? '') : null, fromStatus: e.fromStatus, toStatus: e.toStatus, note: e.note, createdAt: e.createdAt.toISOString() };
  }

  private objection(o: TaskObjectionRow): TaskObjectionDto {
    return { id: o.id, reason: o.reason, note: o.note, status: o.status, raisedBy: person(o.raisedByUserId, o.raisedByName), expiresAt: o.expiresAt.toISOString() };
  }
}
