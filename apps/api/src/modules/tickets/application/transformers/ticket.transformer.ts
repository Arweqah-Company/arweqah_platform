import { Injectable } from '@nestjs/common';
import {
  riyadhToday,
  type ReactionSummaryDto,
  type TicketAttachmentDto,
  type TicketDeskDto,
  type TicketDeskSettingsDto,
  type TicketDto,
  type TicketEventDto,
  type TicketListItemDto,
  type TicketRelation,
  type TicketTypeDto,
} from '@arweqah-platform/shared';
import { abilitiesFor, reopenDaysLeft } from '../../domain/rules/ticket-lifecycle.rules';
import { withinReplyEditWindow } from '../../domain/rules/ticket-reply.rules';
import { isNewTicket, isOverdue, isStale } from '../../domain/rules/ticket-flags.rules';
import type { AttachmentRow, MentionRow, DeskRecord, DepartmentFacts, TicketEventRow, TicketRow, TypeRecord } from '../../domain/types/ticket.types';

/** Who is looking at the conversation: what decides the edit button and the chips of reactions (mine). */
export interface ConversationViewer {
  userId: string;
  canEditReply: boolean;
  reactions: Map<string, ReactionSummaryDto[]>;
}

export interface DeskNames {
  nameAr: string;
  nameEn: string;
  pathAr: string;
  pathEn: string;
}

const NO_NAMES: DeskNames = { nameAr: '', nameEn: '', pathAr: '', pathEn: '' };

@Injectable()
export class TicketTransformer {
  toListItem(row: TicketRow, desk: DeskNames | undefined, now: Date, withDetails = false): TicketListItemDto {
    return {
      id: row.id,
      number: row.number,
      title: row.title,
      status: row.status,
      closeReason: row.closeReason,
      priority: row.priority,
      neededBy: row.neededBy,
      isPersonal: row.isPersonal,
      deskId: row.deskId,
      deskNameAr: desk?.nameAr ?? '',
      deskNameEn: desk?.nameEn ?? '',
      typeId: row.typeId,
      typeNameAr: row.typeNameAr,
      typeNameEn: row.typeNameEn,
      sender: { id: row.senderUserId, name: row.senderName },
      assignee: row.assigneeUserId ? { id: row.assigneeUserId, name: row.assigneeName ?? '' } : null,
      createdAt: row.createdAt.toISOString(),
      lastActivityAt: row.lastActivityAt.toISOString(),
      overdue: isOverdue(row.neededBy, row.status, riyadhToday(now)),
      stale: isStale(row.status, row.lastActivityAt, row.deskStaleAfterDays, now),
      isNew: isNewTicket(row.firstResponseAt, row.status),
      ...(withDetails && { details: row.details }),
    };
  }

  toDetail(input: { row: TicketRow; desk: DeskNames | undefined; relations: TicketRelation[]; events: TicketEventRow[]; attachments: AttachmentRow[]; mentions: MentionRow[]; conversation: ConversationViewer; now: Date; handlers?: { id: string; name: string }[]; canReassign?: boolean; canDelete?: boolean; canChooseHandler?: boolean }): TicketDto {
    const { row, relations, now } = input;
    const left = reopenDaysLeft(row.status, row.closedAt, row.deskReopenWindowDays, now);
    const abilities = abilitiesFor(relations, row.status, left, { canReassign: input.canReassign, canDelete: input.canDelete, canChooseHandler: input.canChooseHandler });
    return {
      ...this.toListItem(row, input.desk, now),
      details: row.details,
      handlers: input.handlers ?? [],
      relations,
      abilities,
      events: input.events.map((e) => this.toEvent(e, input.attachments, input.mentions, { ...input.conversation, mayReply: abilities.reply, now })),
      reopenDaysLeft: left,
      closeRequestedAt: row.closeRequestedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
    };
  }

  private toEvent(e: TicketEventRow, attachments: AttachmentRow[], mentions: MentionRow[], viewer: ConversationViewer & { mayReply: boolean; now: Date }): TicketEventDto {
    const files: TicketAttachmentDto[] = attachments.filter((a) => a.eventId === e.id).map(({ fileId, originalName, contentType, size }) => ({ fileId, originalName, contentType, size }));
    return {
      id: e.id,
      type: e.type,
      actor: e.actorUserId ? { id: e.actorUserId, name: e.actorName ?? '' } : null,
      body: e.body,
      parentId: e.parentEventId,
      replyTo: e.replyToUserId ? { id: e.replyToUserId, name: e.replyToName ?? '' } : null,
      mentions: mentions.filter((m) => m.eventId === e.id).map((m) => ({ id: m.userId, name: m.name })),
      attachments: files,
      createdAt: e.createdAt.toISOString(),
      isEdited: e.editedAt !== null,
      mayEdit: e.type === 'reply' && e.actorUserId === viewer.userId && viewer.canEditReply && viewer.mayReply && withinReplyEditWindow(e.createdAt, viewer.now),
      reactions: viewer.reactions.get(e.id) ?? [],
    };
  }

  toTypeDto(t: TypeRecord): TicketTypeDto {
    return {
      id: t.id,
      deskId: t.deskId,
      nameAr: t.nameAr,
      nameEn: t.nameEn,
      descriptionAr: t.descriptionAr,
      descriptionEn: t.descriptionEn,
      instructionsAr: t.instructionsAr,
      instructionsEn: t.instructionsEn,
      handlers: t.handlers,
      dueDays: t.dueDays,
      isPersonal: t.isPersonal,
      isActive: t.isActive,
    };
  }

  toDeskDto(input: { department: DepartmentFacts; names: DeskNames | undefined; company: { nameAr: string; nameEn: string } | undefined; settings: DeskRecord; types: TypeRecord[] }): TicketDeskDto {
    const { department } = input;
    const names = input.names ?? NO_NAMES;
    return {
      orgNodeId: department.orgNodeId,
      parentId: department.parentId,
      companyId: department.companyId,
      companyNameAr: input.company?.nameAr ?? '',
      companyNameEn: input.company?.nameEn ?? '',
      ...names,
      startDate: department.startDate,
      manager: department.managerUserId ? { id: department.managerUserId, name: department.managerName ?? '' } : null,
      settings: this.toSettings(input.settings),
      types: input.types.map((t) => this.toTypeDto(t)),
    };
  }

  private toSettings(s: DeskRecord): TicketDeskSettingsDto {
    return {
      receptionStatus: s.receptionStatus,
      descriptionAr: s.descriptionAr,
      descriptionEn: s.descriptionEn,
      acceptsPersonal: s.acceptsPersonal,
      defaultDueDays: s.defaultDueDays,
      minLeadDays: s.minLeadDays,
      autoCloseDays: s.autoCloseDays,
      reopenWindowDays: s.reopenWindowDays,
      staleAfterDays: s.staleAfterDays,
    };
  }
}
