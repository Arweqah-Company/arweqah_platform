import { formatTicketNumber } from '@arweqah-platform/shared';
import { localizedVariable, noticeTemplate, variable } from '../../../../core/templates/domain/rules/define-template';
import type { TemplateDefinition } from '../../../../core/templates/domain/types/template.types';
import type { NoticeKind } from './ticket.messages';

/**
 * The notices of tickets (and their e-mail copies) are templates an administrator can reword. They carry the ticket number and the
 * department, never the title or the details: a ticket may be a personal matter and e-mail is not the place for it.
 */
export const TICKET_TEMPLATE_KEYS: Record<NoticeKind, string> = {
  created: 'ticket.created',
  reply: 'ticket.reply',
  closeRequested: 'ticket.close_requested',
  closedNotExecuted: 'ticket.closed_not_executed',
  autoClosed: 'ticket.auto_closed',
  reopened: 'ticket.reopened',
  stale: 'ticket.stale',
  personalMoved: 'ticket.personal_moved',
};

const NUMBER = variable('ticketNumber', ['رقم التذكرة', 'The ticket number'], formatTicketNumber(123));
const DESK = localizedVariable('deskName', ['اسم الإدارة المستقبلة', 'The receiving department'], ['إدارة الخدمات المشتركة', 'Shared services']);
const COUNT = variable('count', ['عدد التذاكر', 'The number of tickets'], '4');

type Spec = [NoticeKind, [string, string], [string, string], [string, string], [string, string]];

const SPECS: Spec[] = [
  ['created', ['تذكرة جديدة', 'New ticket'], ['عند وصول تذكرة جديدة إلى إدارة', 'When a new ticket reaches a department'], ['تذكرة جديدة {{ticketNumber}}', 'New ticket {{ticketNumber}}'], ['وصلتك تذكرة جديدة في {{deskName}}.', 'A new ticket arrived at {{deskName}}.']],
  ['reply', ['ردّ جديد', 'New reply'], ['عند ردّ جديد على تذكرة', 'When a ticket gets a reply'], ['ردّ جديد على {{ticketNumber}}', 'New reply on {{ticketNumber}}'], ['هناك ردّ جديد على التذكرة {{ticketNumber}}.', 'There is a new reply on ticket {{ticketNumber}}.']],
  ['closeRequested', ['طلب إغلاق', 'Closing requested'], ['عندما تطلب الإدارة إغلاق تذكرة المرسل', 'When the department asks to close the sender’s ticket'], ['طلب إغلاق {{ticketNumber}}', 'Closing requested for {{ticketNumber}}'], ['طلبت {{deskName}} إغلاق تذكرتك. أكّد التنفيذ أو ردّ عليها.', '{{deskName}} asked to close your ticket. Confirm it was done, or reply.']],
  ['closedNotExecuted', ['إغلاق دون تنفيذ', 'Closed without being carried out'], ['عندما تُغلق التذكرة دون تنفيذ الطلب', 'When a ticket is closed without carrying out the request'], ['أُغلقت {{ticketNumber}} دون تنفيذ', '{{ticketNumber}} closed without being carried out'], ['أغلقت {{deskName}} تذكرتك {{ticketNumber}} دون تنفيذ الطلب.', '{{deskName}} closed your ticket {{ticketNumber}} without carrying it out.']],
  ['autoClosed', ['إغلاق تلقائي', 'Closed automatically'], ['عندما تُغلق التذكرة تلقائيًا لانتهاء مهلة الردّ', 'When a ticket closes by itself because the time to answer ended'], ['أُغلقت {{ticketNumber}} تلقائيًا', '{{ticketNumber}} closed automatically'], ['أُغلقت التذكرة {{ticketNumber}} لانتهاء مهلة الردّ على طلب الإغلاق.', 'Ticket {{ticketNumber}} was closed because the time to answer the closing request ended.']],
  ['reopened', ['إعادة فتح', 'Reopened'], ['عندما يعيد المرسل فتح تذكرة', 'When the sender reopens a ticket'], ['أُعيد فتح {{ticketNumber}}', '{{ticketNumber}} reopened'], ['أعاد المرسل فتح التذكرة {{ticketNumber}}.', 'The sender reopened ticket {{ticketNumber}}.']],
  ['stale', ['تذكرة راكدة', 'Stale ticket'], ['عندما لا تتحرك التذكرة مدة طويلة', 'When a ticket has had no activity for a while'], ['التذكرة {{ticketNumber}} راكدة', 'Ticket {{ticketNumber}} is stale'], ['لا حركة على التذكرة {{ticketNumber}} منذ مدة. تحتاج تدخلًا.', 'Ticket {{ticketNumber}} has had no activity for a while. It needs attention.']],
  ['personalMoved', ['نقل تذاكر شخصية', 'Personal tickets moved'], ['عندما تنتقل تذاكر شخصية مفتوحة إلى مسؤول جديد', 'When open personal tickets move to a new assignee'], ['نُقلت تذاكر شخصية إلى مسؤول جديد', 'Personal tickets moved to a new assignee'], ['نُقل {{count}} تذكرة شخصية مفتوحة في {{deskName}} إلى المسؤول الجديد.', '{{count}} open personal tickets of {{deskName}} moved to the new assignee.']],
];

export const TICKET_TEMPLATES: TemplateDefinition[] = SPECS.map(([kind, name, when, title, body]) =>
  noticeTemplate({ key: TICKET_TEMPLATE_KEYS[kind], area: 'tickets', name, when, variables: kind === 'personalMoved' ? [DESK, COUNT] : [NUMBER, DESK], title, body }),
);
