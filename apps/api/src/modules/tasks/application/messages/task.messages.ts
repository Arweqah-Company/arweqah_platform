import { formatTaskNumber, type TaskStatus } from '@arweqah-platform/shared';

/** Audit action names of the tasks module. Services use these constants, never inline strings. */
export const TASK_AUDIT = {
  created: 'task.created',
  updated: 'task.updated',
  moved: 'task.moved',
  approved: 'task.approved',
  rejected: 'task.rejected',
  resubmitted: 'task.resubmitted',
  objected: 'task.objected',
  objectionAnswered: 'task.objection_answered',
  objectionExpired: 'task.objection_expired',
  archived: 'task.archived',
  handoverSkipped: 'task.handover_skipped',
  restored: 'task.restored',
  handedOver: 'task.handed_over',
  timeLogged: 'task.time_logged',
  tagCreated: 'task.tag.created',
  tagUpdated: 'task.tag.updated',
  tagRemoved: 'task.tag.removed',
  policyUpdated: 'task.policy.updated',
} as const;

export const TASK_TOPICS = {
  objectionExpiry: 'tasks.objection-expiry',
  handover: 'tasks.handover',
} as const;

export type TaskNoticeKind =
  | 'assigned'
  | 'statusChanged'
  | 'finished'
  | 'awaitingReview'
  | 'completionRejected'
  | 'approvalRequested'
  | 'approved'
  | 'approvalRejected'
  | 'objected'
  | 'objectionAnswered'
  | 'objectionExpired'
  | 'overdue'
  | 'estimateExceeded'
  | 'reminder'
  | 'digest'
  | 'handedOver'
  | 'handedOverMany'
  | 'reassigned'
  | 'archived'
  | 'restored';

/** Notices that also go out by e-mail: their text never carries the title (e-mail is not the place for it). */
export const EMAIL_NOTICES: ReadonlySet<TaskNoticeKind> = new Set<TaskNoticeKind>(['assigned', 'objected', 'completionRejected', 'awaitingReview', 'handedOver', 'handedOverMany']);

export interface TaskNotice {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

interface NoticeContext {
  number: number | string;
  title: string;
  /** For `statusChanged`. */
  toStatus?: TaskStatus;
  /** For `digest` and `handedOver`. */
  count?: number;
}

const STATUS_NAMES: Record<TaskStatus, { ar: string; en: string }> = {
  pending_approval: { ar: 'بانتظار الاعتماد', en: 'Pending approval' },
  todo: { ar: 'للتنفيذ', en: 'To do' },
  in_progress: { ar: 'قيد التنفيذ', en: 'In progress' },
  awaiting_review: { ar: 'بانتظار المراجعة', en: 'Awaiting review' },
  done: { ar: 'مكتملة', en: 'Done' },
  rejected: { ar: 'مرفوضة', en: 'Rejected' },
};

/**
 * Texts of the notices. They always carry the task number; the title is added only where the notice does not also go by e-mail.
 */
export function taskNoticeFor(kind: TaskNoticeKind, c: NoticeContext): TaskNotice {
  const n = formatTaskNumber(c.number);
  const what = EMAIL_NOTICES.has(kind) ? { ar: n, en: n } : { ar: `${n} — ${c.title}`, en: `${n} — ${c.title}` };
  const status = c.toStatus ? STATUS_NAMES[c.toStatus] : { ar: '', en: '' };
  const count = c.count ?? 0;
  const texts: Record<TaskNoticeKind, TaskNotice> = {
    assigned: { titleAr: `مهمة جديدة ${n}`, titleEn: `New task ${n}`, bodyAr: `أُسندت إليك المهمة ${what.ar}.`, bodyEn: `Task ${what.en} was assigned to you.` },
    statusChanged: { titleAr: `تغيّرت حالة ${n}`, titleEn: `${n} changed status`, bodyAr: `صارت المهمة ${what.ar} «${status.ar}».`, bodyEn: `Task ${what.en} is now "${status.en}".` },
    finished: { titleAr: `انتهت ${n}`, titleEn: `${n} is finished`, bodyAr: `اكتملت المهمة ${what.ar}.`, bodyEn: `Task ${what.en} is finished.` },
    awaitingReview: { titleAr: `${n} بانتظار مراجعتك`, titleEn: `${n} awaits your review`, bodyAr: `المهمة ${what.ar} جاهزة لمراجعتك.`, bodyEn: `Task ${what.en} is ready for your review.` },
    completionRejected: { titleAr: `أُعيدت ${n} للتنفيذ`, titleEn: `${n} was sent back`, bodyAr: `رفض المراجع إنجاز المهمة ${what.ar}؛ راجع ملاحظته وأكمل العمل.`, bodyEn: `The reviewer sent task ${what.en} back; read the note and continue.` },
    approvalRequested: { titleAr: `مهمة تنتظر اعتمادك ${n}`, titleEn: `Task ${n} awaits your approval`, bodyAr: `أنشأ أحد فريقك المهمة ${what.ar} لنفسه وينتظر اعتمادك.`, bodyEn: `Someone on your team gave themselves task ${what.en} and waits for your approval.` },
    approved: { titleAr: `اعتُمدت ${n}`, titleEn: `${n} was approved`, bodyAr: `اعتُمدت المهمة ${what.ar}.`, bodyEn: `Task ${what.en} was approved.` },
    approvalRejected: { titleAr: `رُفضت ${n}`, titleEn: `${n} was rejected`, bodyAr: `رُفضت المهمة ${what.ar} عند الاعتماد.`, bodyEn: `Task ${what.en} was rejected at approval.` },
    objected: { titleAr: `اعتراض على ${n}`, titleEn: `Objection to ${n}`, bodyAr: `اعترض المسند إليه على المهمة ${what.ar}.`, bodyEn: `The assignee objected to task ${what.en}.` },
    objectionAnswered: { titleAr: `ردّ على اعتراضك ${n}`, titleEn: `Answer to your objection on ${n}`, bodyAr: `تم الردّ على اعتراضك على المهمة ${what.ar}.`, bodyEn: `Your objection to task ${what.en} was answered.` },
    objectionExpired: { titleAr: `سقط الاعتراض على ${n}`, titleEn: `The objection to ${n} lapsed`, bodyAr: `لم يُردّ على الاعتراض خلال المدة، وتبقى المهمة ${what.ar} على المسند إليه.`, bodyEn: `Nobody answered in time; task ${what.en} stays with the assignee.` },
    overdue: { titleAr: `فات موعد ${n}`, titleEn: `${n} is overdue`, bodyAr: `تجاوزت المهمة ${what.ar} موعدها.`, bodyEn: `Task ${what.en} passed its due date.` },
    estimateExceeded: { titleAr: `تجاوز التقدير في ${n}`, titleEn: `${n} passed its estimate`, bodyAr: `تجاوزت الساعات المسجلة على المهمة ${what.ar} الوقت المقدَّر.`, bodyEn: `The time logged on task ${what.en} passed the estimate.` },
    reminder: { titleAr: `تذكير بموعد ${n}`, titleEn: `Reminder: ${n} is due soon`, bodyAr: `موعد المهمة ${what.ar} قريب.`, bodyEn: `Task ${what.en} is due soon.` },
    digest: { titleAr: 'ملخص المهام المتأخرة', titleEn: 'Overdue tasks summary', bodyAr: `عند فريقك ${count} مهمة متأخرة.`, bodyEn: `Your team has ${count} overdue tasks.` },
    handedOver: { titleAr: `انتقلت إليك ${n}`, titleEn: `${n} was handed over to you`, bodyAr: `انتقلت إليك المهمة ${what.ar} بسبب انتهاء خدمة موظف.`, bodyEn: `Task ${what.en} was handed over to you because an employee left.` },
    handedOverMany: { titleAr: 'انتقلت إليك مهام', titleEn: 'Tasks were handed over to you', bodyAr: `انتقلت إليك ${count} مهمة بسبب انتهاء خدمة موظف.`, bodyEn: `${count} tasks were handed over to you because an employee left.` },
    reassigned: { titleAr: `تغيّر المسند إليه في ${n}`, titleEn: `${n} has a new assignee`, bodyAr: `انتقلت المهمة ${what.ar} إلى مسؤول جديد بسبب انتهاء خدمة موظف.`, bodyEn: `Task ${what.en} moved to a new assignee because an employee left.` },
    archived: { titleAr: `أُرشفت ${n}`, titleEn: `${n} was archived`, bodyAr: `أُرشفت المهمة ${what.ar}.`, bodyEn: `Task ${what.en} was archived.` },
    restored: { titleAr: `استُرجعت ${n}`, titleEn: `${n} was restored`, bodyAr: `استُرجعت المهمة ${what.ar} من الأرشيف.`, bodyEn: `Task ${what.en} was restored from the archive.` },
  };
  return texts[kind];
}
