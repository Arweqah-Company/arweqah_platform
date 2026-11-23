import { localizedVariable, noticeTemplate, variable } from '../../../../core/templates/domain/rules/define-template';
import type { TemplateDefinition } from '../../../../core/templates/domain/types/template.types';
import type { NoticeNoticeKind } from './notice.messages';

/**
 * The notices of the notices module are templates an administrator can reword. They carry the title of the notice, which is meant to be read by its audience,
 * never its text, and never a reminder: the only notice to the audience is the one at publication (decision N3).
 */
export const NOTICE_TEMPLATE_KEYS: Record<NoticeNoticeKind, string> = {
  submitted: 'notice.submitted',
  approved: 'notice.approved',
  rejected: 'notice.rejected',
  published: 'notice.published',
  updated: 'notice.updated',
  withdrawn: 'notice.withdrawn',
  writerAdded: 'notice.writer_added',
  writerRemoved: 'notice.writer_removed',
  batchFailed: 'notice.batch_failed',
};

const TITLE = localizedVariable('noticeTitle', ['عنوان التعميم', 'The title of the notice'], ['سياسة السفر والإيفاد', 'Travel and assignment policy']);
const CHANNEL = localizedVariable('channelName', ['اسم القناة', 'The name of the channel'], ['قناة الموارد البشرية', 'Human resources channel']);
const AUTHOR = variable('authorName', ['اسم الكاتب', 'The name of the writer'], 'Sara');
const PUBLISH_ON = variable('publishOn', ['تاريخ النشر', 'The publish date'], '2026-12-01');
const REASON = variable('reason', ['سبب الرفض', 'The reason of the rejection'], 'Please add the effective date.');

type Spec = [NoticeNoticeKind, [string, string], [string, string], [string, string], [string, string], ReturnType<typeof variable>[]];

const SPECS: Spec[] = [
  ['submitted', ['تعميم بانتظار اعتمادك', 'A notice waits for your approval'], ['عندما يرسل أحد كتّاب وحدتك تعميمًا للاعتماد', 'When a writer of your unit sends a notice for approval'], ['تعميم بانتظار اعتمادك', 'A notice waits for your approval'], ['أرسل {{authorName}} التعميم «{{noticeTitle}}» لاعتمادك.', '{{authorName}} sent “{{noticeTitle}}” for your approval.'], [TITLE, AUTHOR]],
  ['approved', ['اعتماد تعميمك', 'Your notice was approved'], ['عندما يعتمد القائد تعميم الكاتب', 'When the head approves the writer’s notice'], ['اعتُمد تعميمك', 'Your notice was approved'], ['اعتُمد التعميم «{{noticeTitle}}» وسيُنشر في {{publishOn}}.', '“{{noticeTitle}}” was approved and will be published on {{publishOn}}.'], [TITLE, PUBLISH_ON]],
  ['rejected', ['رفض تعميمك', 'Your notice was rejected'], ['عندما يرفض القائد تعميم الكاتب', 'When the head rejects the writer’s notice'], ['رُفض تعميمك', 'Your notice was rejected'], ['رُفض التعميم «{{noticeTitle}}». السبب: {{reason}}', '“{{noticeTitle}}” was rejected. Reason: {{reason}}'], [TITLE, REASON]],
  ['published', ['تعميم جديد', 'A new notice'], ['عند وصول تعميم جديد إلى الموظف', 'When a new notice reaches an employee'], ['تعميم جديد: {{noticeTitle}}', 'New notice: {{noticeTitle}}'], ['وصلك تعميم جديد من {{channelName}}: «{{noticeTitle}}».', 'A new notice reached you from {{channelName}}: “{{noticeTitle}}”.'], [TITLE, CHANNEL]],
  ['updated', ['تحديث على تعميم', 'A notice was updated'], ['عند نشر إصدار جديد من تعميم وصل الموظف', 'When a new version of a notice that reached the employee is published'], ['تحديث على: {{noticeTitle}}', 'Updated: {{noticeTitle}}'], ['صدر إصدار جديد من «{{noticeTitle}}» من {{channelName}}.', 'A new version of “{{noticeTitle}}” from {{channelName}} was published.'], [TITLE, CHANNEL]],
  ['withdrawn', ['سحب طلب اعتماد', 'Approval request withdrawn'], ['عندما يسحب الكاتب طلب اعتماد إصدار جديد', 'When the writer withdraws the approval request of a new version'], ['سُحب طلب اعتماد', 'An approval request was withdrawn'], ['سحب {{authorName}} طلب اعتماد «{{noticeTitle}}».', '{{authorName}} withdrew the approval request of “{{noticeTitle}}”.'], [TITLE, AUTHOR]],
  ['writerAdded', ['أصبحت كاتبًا في قناة', 'You became a channel writer'], ['عندما يُضاف الموظف كاتبًا في قناة نشر', 'When an employee is added as a writer of a publishing channel'], ['أصبحت كاتبًا في {{channelName}}', 'You are now a writer in {{channelName}}'], ['أصبحت كاتبًا في {{channelName}}. تجد «إدارة التعاميم» في القائمة.', 'You are now a writer in {{channelName}}. “Notices management” is in the menu.'], [CHANNEL]],
  ['writerRemoved', ['أُزيلت كتابتك من قناة', 'You were removed as a channel writer'], ['عندما يُزال الموظف من كتّاب قناة نشر', 'When an employee is removed from the writers of a publishing channel'], ['أُزيلت كتابتك من {{channelName}}', 'You were removed from {{channelName}}'], ['لم تعد كاتبًا في {{channelName}}. تبقى مسوداتك ولا تُحذف.', 'You are no longer a writer in {{channelName}}. Your drafts are kept.'], [CHANNEL]],
  ['batchFailed', ['تعذر إكمال نشر تعميم', 'A notice could not be fully delivered'], ['عندما تفشل دفعة نشر بعد المحاولات', 'When a delivery batch fails after its retries'], ['تعذر إكمال نشر تعميم', 'A notice could not be fully delivered'], ['تعذر إكمال إيصال «{{noticeTitle}}» لكل جمهوره. راجع سجل التدقيق.', 'Delivering “{{noticeTitle}}” to its whole audience could not be completed. See the audit log.'], [TITLE]],
];

export const NOTICE_TEMPLATES: TemplateDefinition[] = SPECS.map(([kind, name, when, title, body, variables]) =>
  noticeTemplate({ key: NOTICE_TEMPLATE_KEYS[kind], area: 'notices', name, when, variables, title, body }),
);
