import { Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../common/application/transaction-runner';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import type { TaskRow } from '../../domain/types/task.types';
import { formatTaskNumber, type TaskStatus } from '@arweqah-platform/shared';
import { TemplateRenderer } from '../../../../core/templates/application/services/template-renderer';
import { EMAIL_NOTICES, STATUS_NAMES, type TaskNoticeKind } from '../messages/task.messages';
import { TASK_TEMPLATE_KEYS } from '../messages/task-templates';

/** Sends the notices of a task (in the app, and by e-mail for the important ones) inside the caller's transaction. Nobody is told about their own change. */
@Injectable()
export class TaskNotifier {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly templates: TemplateRenderer,
  ) {}

  async send(input: {
    kind: TaskNoticeKind;
    task: Pick<TaskRow, 'id' | 'title'> & { number: string | number };
    recipients: (string | null)[];
    actorUserId?: string | null;
    toStatus?: TaskStatus;
    count?: number;
    commenter?: string;
    /** Where the notice opens (the task page by default). */
    link?: string;
    coalesce?: boolean;
    tx?: TransactionContext;
  }): Promise<void> {
    const userIds = [...new Set(input.recipients.filter((id): id is string => !!id))].filter((id) => id !== input.actorUserId);
    if (!userIds.length) return;
    const notice = await this.notice(input);
    await this.notifications.notify({ userIds, ...notice, link: input.link ?? (input.task.id ? `/tasks/${input.task.id}` : input.kind === 'digest' ? '/tasks/team' : '/tasks'), coalesce: input.coalesce, channels: EMAIL_NOTICES.has(input.kind) ? ['email'] : undefined, purpose: 'tasks', tx: input.tx });
  }

  /** The wording of a notice: the live template filled with the task number (and its title where the notice is not e-mailed) and, for a status change, the status in each language. */
  private notice(input: { kind: TaskNoticeKind; task: { title: string; number: string | number }; toStatus?: TaskStatus; count?: number; commenter?: string }) {
    const number = formatTaskNumber(input.task.number);
    const task = EMAIL_NOTICES.has(input.kind) ? number : `${number} — ${input.task.title}`;
    const status = input.toStatus ? STATUS_NAMES[input.toStatus] : { ar: '', en: '' };
    return this.templates.renderNotice(TASK_TEMPLATE_KEYS[input.kind], { taskNumber: number, task, count: String(input.count ?? 0), commenter: input.commenter ?? '' }, { ar: { status: status.ar }, en: { status: status.en } });
  }
}
