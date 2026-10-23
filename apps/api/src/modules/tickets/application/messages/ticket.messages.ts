import { formatTicketNumber } from '@arweqah-platform/shared';

/** Audit action names of the tickets module. Services use these constants, never inline strings. */
export const TICKET_AUDIT = {
  created: 'ticket.created',
  replied: 'ticket.replied',
  closeRequested: 'ticket.close_requested',
  closeDeclined: 'ticket.close_declined',
  confirmed: 'ticket.confirmed',
  autoClosed: 'ticket.auto_closed',
  closedNotExecuted: 'ticket.closed_not_executed',
  reopened: 'ticket.reopened',
  deskUpdated: 'ticket.desk.updated',
  typeCreated: 'ticket.type.created',
  typeUpdated: 'ticket.type.updated',
  typeRemoved: 'ticket.type.removed',
  personalReassigned: 'ticket.personal.reassigned',
} as const;

export const TICKET_TOPICS = { autoClose: 'tickets.auto-close' } as const;

export type NoticeKind = 'created' | 'reply' | 'closeRequested' | 'closedNotExecuted' | 'autoClosed' | 'reopened' | 'stale' | 'personalMoved';

export interface Notice {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

interface NoticeContext {
  number: number | string;
  deskNameAr: string;
  deskNameEn: string;
  /** For `personalMoved`. */
  count?: number;
}

/**
 * Texts of the notices (and e-mails). They carry the ticket number and the department, never the title or the details:
 * a ticket may be a personal matter and e-mail is not the place for it.
 */
export function noticeFor(kind: NoticeKind, c: NoticeContext): Notice {
  const n = formatTicketNumber(c.number);
  const where = { ar: c.deskNameAr, en: c.deskNameEn };
  const texts: Record<NoticeKind, Notice> = {
    created: { titleAr: `تذكرة جديدة ${n}`, titleEn: `New ticket ${n}`, bodyAr: `وصلتك تذكرة جديدة في ${where.ar}.`, bodyEn: `A new ticket arrived at ${where.en}.` },
    reply: { titleAr: `ردّ جديد على ${n}`, titleEn: `New reply on ${n}`, bodyAr: `هناك ردّ جديد على التذكرة ${n}.`, bodyEn: `There is a new reply on ticket ${n}.` },
    closeRequested: { titleAr: `طلب إغلاق ${n}`, titleEn: `Closing requested for ${n}`, bodyAr: `طلبت ${where.ar} إغلاق تذكرتك. أكّد التنفيذ أو ردّ عليها.`, bodyEn: `${where.en} asked to close your ticket. Confirm it was done, or reply.` },
    closedNotExecuted: { titleAr: `أُغلقت ${n} دون تنفيذ`, titleEn: `${n} closed without being carried out`, bodyAr: `أغلقت ${where.ar} تذكرتك ${n} دون تنفيذ الطلب.`, bodyEn: `${where.en} closed your ticket ${n} without carrying it out.` },
    autoClosed: { titleAr: `أُغلقت ${n} تلقائيًا`, titleEn: `${n} closed automatically`, bodyAr: `أُغلقت التذكرة ${n} لانتهاء مهلة الردّ على طلب الإغلاق.`, bodyEn: `Ticket ${n} was closed because the time to answer the closing request ended.` },
    reopened: { titleAr: `أُعيد فتح ${n}`, titleEn: `${n} reopened`, bodyAr: `أعاد المرسل فتح التذكرة ${n}.`, bodyEn: `The sender reopened ticket ${n}.` },
    stale: { titleAr: `التذكرة ${n} راكدة`, titleEn: `Ticket ${n} is stale`, bodyAr: `لا حركة على التذكرة ${n} منذ مدة. تحتاج تدخلًا.`, bodyEn: `Ticket ${n} has had no activity for a while. It needs attention.` },
    personalMoved: {
      titleAr: 'نُقلت تذاكر شخصية إلى مسؤول جديد',
      titleEn: 'Personal tickets moved to a new assignee',
      bodyAr: `نُقل ${c.count ?? 0} تذكرة شخصية مفتوحة في ${where.ar} إلى المسؤول الجديد.`,
      bodyEn: `${c.count ?? 0} open personal tickets of ${where.en} moved to the new assignee.`,
    },
  };
  return texts[kind];
}
