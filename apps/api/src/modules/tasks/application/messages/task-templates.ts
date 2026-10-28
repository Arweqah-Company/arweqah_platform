import { formatTaskNumber } from '@arweqah-platform/shared';
import { localizedVariable, noticeTemplate, variable } from '../../../../core/templates/domain/rules/define-template';
import type { TemplateDefinition } from '../../../../core/templates/domain/types/template.types';
import type { TaskNoticeKind } from './task.messages';

/**
 * The notices of tasks (and the e-mail copies) are templates an administrator can reword. `{{task}}` is the task's number, and
 * its title too where the notice does not also go by e-mail (e-mail is not the place for a title).
 */
export const TASK_TEMPLATE_KEYS: Record<TaskNoticeKind, string> = {
  assigned: 'task.assigned',
  statusChanged: 'task.status_changed',
  finished: 'task.finished',
  awaitingReview: 'task.awaiting_review',
  completionRejected: 'task.completion_rejected',
  approvalRequested: 'task.approval_requested',
  approved: 'task.approved',
  approvalRejected: 'task.approval_rejected',
  objected: 'task.objected',
  objectionAnswered: 'task.objection_answered',
  objectionExpired: 'task.objection_expired',
  overdue: 'task.overdue',
  estimateExceeded: 'task.estimate_exceeded',
  reminder: 'task.reminder',
  digest: 'task.digest',
  handedOver: 'task.handed_over',
  handedOverMany: 'task.handed_over_many',
  reassigned: 'task.reassigned',
  archived: 'task.archived',
  restored: 'task.restored',
  commentMentioned: 'task.comment_mentioned',
  commentReplied: 'task.comment_replied',
  commentAdded: 'task.comment_added',
};

const NUMBER = variable('taskNumber', ['رقم المهمة', 'The task number'], formatTaskNumber(45));
const TASK = localizedVariable('task', ['المهمة (رقمها، ومعه عنوانها حيث يجوز)', 'The task (its number, with its title where allowed)'], [`${formatTaskNumber(45)} — إعداد التقرير`, `${formatTaskNumber(45)} — Prepare the report`]);
const STATUS = localizedVariable('status', ['الحالة الجديدة', 'The new status'], ['قيد التنفيذ', 'In progress']);
const COMMENTER = variable('commenter', ['اسم كاتب التعليق', 'The name of the person who commented'], 'Sara');
const COUNT = variable('count', ['العدد', 'The count'], '5');

type Spec = [TaskNoticeKind, [string, string], [string, string], [string, string], [string, string]];

const SPECS: Spec[] = [
  ['assigned', ['مهمة جديدة', 'New task'], ['عند إسناد مهمة إلى شخص', 'When a task is assigned to someone'], ['مهمة جديدة {{taskNumber}}', 'New task {{taskNumber}}'], ['أُسندت إليك المهمة {{task}}.', 'Task {{task}} was assigned to you.']],
  ['statusChanged', ['تغيّر الحالة', 'Status changed'], ['عند تغيّر حالة مهمة', 'When a task changes status'], ['تغيّرت حالة {{taskNumber}}', '{{taskNumber}} changed status'], ['صارت المهمة {{task}} «{{status}}».', 'Task {{task}} is now "{{status}}".']],
  ['finished', ['اكتملت المهمة', 'Task finished'], ['عند اكتمال مهمة', 'When a task is finished'], ['انتهت {{taskNumber}}', '{{taskNumber}} is finished'], ['اكتملت المهمة {{task}}.', 'Task {{task}} is finished.']],
  ['awaitingReview', ['بانتظار المراجعة', 'Awaiting review'], ['عندما تصير مهمة جاهزة لمراجعة المراجع', 'When a task is ready for the reviewer'], ['{{taskNumber}} بانتظار مراجعتك', '{{taskNumber}} awaits your review'], ['المهمة {{task}} جاهزة لمراجعتك.', 'Task {{task}} is ready for your review.']],
  ['completionRejected', ['رفض الإنجاز', 'Completion rejected'], ['عندما يرفض المراجع إنجاز مهمة', 'When the reviewer sends a task back'], ['أُعيدت {{taskNumber}} للتنفيذ', '{{taskNumber}} was sent back'], ['رفض المراجع إنجاز المهمة {{task}}؛ راجع ملاحظته وأكمل العمل.', 'The reviewer sent task {{task}} back; read the note and continue.']],
  ['approvalRequested', ['طلب اعتماد', 'Approval requested'], ['عندما ينشئ أحد الفريق مهمة لنفسه وتنتظر اعتماد مديره', 'When someone creates a task for themselves and it awaits their manager'], ['مهمة تنتظر اعتمادك {{taskNumber}}', 'Task {{taskNumber}} awaits your approval'], ['أنشأ أحد فريقك المهمة {{task}} لنفسه وينتظر اعتمادك.', 'Someone on your team gave themselves task {{task}} and waits for your approval.']],
  ['approved', ['اعتماد المهمة', 'Task approved'], ['عند اعتماد مهمة', 'When a task is approved'], ['اعتُمدت {{taskNumber}}', '{{taskNumber}} was approved'], ['اعتُمدت المهمة {{task}}.', 'Task {{task}} was approved.']],
  ['approvalRejected', ['رفض الاعتماد', 'Approval rejected'], ['عند رفض مهمة في الاعتماد', 'When a task is rejected at approval'], ['رُفضت {{taskNumber}}', '{{taskNumber}} was rejected'], ['رُفضت المهمة {{task}} عند الاعتماد.', 'Task {{task}} was rejected at approval.']],
  ['objected', ['اعتراض على مهمة', 'Objection to a task'], ['عندما يعترض المسند إليه على مهمة', 'When the assignee objects to a task'], ['اعتراض على {{taskNumber}}', 'Objection to {{taskNumber}}'], ['اعترض المسند إليه على المهمة {{task}}.', 'The assignee objected to task {{task}}.']],
  ['objectionAnswered', ['ردّ على اعتراض', 'Objection answered'], ['عند الردّ على اعتراض', 'When an objection is answered'], ['ردّ على اعتراضك {{taskNumber}}', 'Answer to your objection on {{taskNumber}}'], ['تم الردّ على اعتراضك على المهمة {{task}}.', 'Your objection to task {{task}} was answered.']],
  ['objectionExpired', ['سقوط الاعتراض', 'Objection lapsed'], ['عندما تنتهي مهلة الردّ على اعتراض', 'When the time to answer an objection runs out'], ['سقط الاعتراض على {{taskNumber}}', 'The objection to {{taskNumber}} lapsed'], ['لم يُردّ على الاعتراض خلال المدة، وتبقى المهمة {{task}} على المسند إليه.', 'Nobody answered in time; task {{task}} stays with the assignee.']],
  ['overdue', ['تأخر المهمة', 'Task overdue'], ['عندما تتجاوز مهمة موعدها', 'When a task passes its due date'], ['فات موعد {{taskNumber}}', '{{taskNumber}} is overdue'], ['تجاوزت المهمة {{task}} موعدها.', 'Task {{task}} passed its due date.']],
  ['estimateExceeded', ['تجاوز التقدير', 'Estimate exceeded'], ['عندما تتجاوز الساعات المسجلة الوقت المقدَّر', 'When the time logged passes the estimate'], ['تجاوز التقدير في {{taskNumber}}', '{{taskNumber}} passed its estimate'], ['تجاوزت الساعات المسجلة على المهمة {{task}} الوقت المقدَّر.', 'The time logged on task {{task}} passed the estimate.']],
  ['reminder', ['تذكير بالموعد', 'Due-date reminder'], ['قبل موعد المهمة', 'Before a task is due'], ['تذكير بموعد {{taskNumber}}', 'Reminder: {{taskNumber}} is due soon'], ['موعد المهمة {{task}} قريب.', 'Task {{task}} is due soon.']],
  ['digest', ['ملخص المتأخرة', 'Overdue summary'], ['ملخص دوري لمدير الفريق بالمهام المتأخرة', 'The periodic summary of overdue tasks for a team manager'], ['ملخص المهام المتأخرة', 'Overdue tasks summary'], ['عند فريقك {{count}} مهمة متأخرة.', 'Your team has {{count}} overdue tasks.']],
  ['handedOver', ['انتقال مهمة', 'Task handed over'], ['عندما تنتقل مهمة إلى شخص بسبب انتهاء خدمة موظف', 'When a task moves to someone because an employee left'], ['انتقلت إليك {{taskNumber}}', '{{taskNumber}} was handed over to you'], ['انتقلت إليك المهمة {{task}} بسبب انتهاء خدمة موظف.', 'Task {{task}} was handed over to you because an employee left.']],
  ['handedOverMany', ['انتقال عدة مهام', 'Many tasks handed over'], ['عندما تنتقل عدة مهام إلى شخص بسبب انتهاء خدمة موظف', 'When many tasks move to someone because an employee left'], ['انتقلت إليك مهام', 'Tasks were handed over to you'], ['انتقلت إليك {{count}} مهمة بسبب انتهاء خدمة موظف.', '{{count}} tasks were handed over to you because an employee left.']],
  ['reassigned', ['تغيّر المسند إليه', 'New assignee'], ['عندما تنتقل مهمة إلى مسؤول جديد بسبب انتهاء خدمة موظف', 'When a task moves to a new assignee because an employee left'], ['تغيّر المسند إليه في {{taskNumber}}', '{{taskNumber}} has a new assignee'], ['انتقلت المهمة {{task}} إلى مسؤول جديد بسبب انتهاء خدمة موظف.', 'Task {{task}} moved to a new assignee because an employee left.']],
  ['archived', ['أرشفة مهمة', 'Task archived'], ['عند أرشفة مهمة', 'When a task is archived'], ['أُرشفت {{taskNumber}}', '{{taskNumber}} was archived'], ['أُرشفت المهمة {{task}}.', 'Task {{task}} was archived.']],
  ['restored', ['استرجاع مهمة', 'Task restored'], ['عند استرجاع مهمة من الأرشيف', 'When a task is restored from the archive'], ['استُرجعت {{taskNumber}}', '{{taskNumber}} was restored'], ['استُرجعت المهمة {{task}} من الأرشيف.', 'Task {{task}} was restored from the archive.']],
  ['commentMentioned', ['ذكرك أحد في تعليق', 'Mentioned in a comment'], ['عندما يذكرك زميل بـ @ في تعليق على مهمة (البريد بلا نص التعليق)', 'When a colleague mentions you with @ in a comment on a task (the e-mail never carries the comment)'], ['ذكرك {{commenter}} في {{taskNumber}}', '{{commenter}} mentioned you in {{taskNumber}}'], ['ذكرك {{commenter}} في تعليق على المهمة {{task}}.', '{{commenter}} mentioned you in a comment on task {{task}}.']],
  ['commentReplied', ['ردّ على تعليقك', 'Reply to your comment'], ['عندما يرد أحد على تعليقك في مهمة', 'When someone replies to your comment on a task'], ['ردّ {{commenter}} على تعليقك في {{taskNumber}}', '{{commenter}} replied to your comment in {{taskNumber}}'], ['ردّ {{commenter}} على تعليقك في المهمة {{task}}.', '{{commenter}} replied to your comment on task {{task}}.']],
  ['commentAdded', ['تعليق جديد', 'New comment'], ['عند كتابة تعليق على مهمة أنت فيها (لا يصل تكراره ما دام السابق غير مقروء)', 'When someone comments on a task you are in (not repeated while the earlier notice is unread)'], ['تعليق جديد على {{taskNumber}}', 'New comment on {{taskNumber}}'], ['كتب {{commenter}} تعليقًا على المهمة {{task}}.', '{{commenter}} commented on task {{task}}.']],
];

const COUNTED: ReadonlySet<TaskNoticeKind> = new Set(['digest', 'handedOverMany']);

const COMMENTED: ReadonlySet<TaskNoticeKind> = new Set(['commentMentioned', 'commentReplied', 'commentAdded']);

const variablesOf = (kind: TaskNoticeKind) => {
  if (COUNTED.has(kind)) return [COUNT];
  if (COMMENTED.has(kind)) return [NUMBER, TASK, COMMENTER];
  return kind === 'statusChanged' ? [NUMBER, TASK, STATUS] : [NUMBER, TASK];
};

export const TASK_TEMPLATES: TemplateDefinition[] = SPECS.map(([kind, name, when, title, body]) =>
  noticeTemplate({ key: TASK_TEMPLATE_KEYS[kind], area: 'tasks', name, when, variables: variablesOf(kind), title, body }),
);
