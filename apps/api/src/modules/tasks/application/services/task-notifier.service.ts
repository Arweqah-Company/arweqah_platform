import { Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../common/application/transaction-runner';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import type { TaskRow } from '../../domain/types/task.types';
import { formatTaskNumber, type TaskStatus } from '@arweqah-platform/shared';
import { TemplateRenderer } from '../../../../core/templates/application/services/template-renderer';
import { CHOSEN_CHANNEL_NOTICES, EMAIL_NOTICES, STATUS_NAMES, type TaskNoticeKind } from '../messages/task.messages';
import { TaskNoticeSettingsService } from './task-notice-settings.service';
import { TASK_TEMPLATE_KEYS } from '../messages/task-templates';

export interface NoticeInput {
  kind: TaskNoticeKind;
  task: Pick<TaskRow, 'id' | 'title'> & { number: string | number };
  recipients: (string | null)[];
  actorUserId?: string | null;
  toStatus?: TaskStatus;
  count?: number;
  /** The numbers of the daily summary. */
  figures?: { open: number; dueToday: number; overdue: number };
  commenter?: string;
  /** Where the notice opens (the task page by default). */
  link?: string;
  coalesce?: boolean;
  tx?: TransactionContext;
}

/** The numbers of the daily summary as the template's variables. */
const figuresOf = ({ figures }: NoticeInput) => ({ open: String(figures?.open ?? 0), dueToday: String(figures?.dueToday ?? 0), overdue: String(figures?.overdue ?? 0) });

/** Sends the notices of a task (in the app, and by e-mail for the important ones) inside the caller's transaction. Nobody is told about their own change. */
@Injectable()
export class TaskNotifier {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly templates: TemplateRenderer,
    private readonly settings: TaskNoticeSettingsService,
  ) {}

  async send(input: NoticeInput): Promise<void> {
    const userIds = [...new Set(input.recipients.filter((id): id is string => !!id))].filter((id) => id !== input.actorUserId);
    if (!userIds.length) return;
    if (!CHOSEN_CHANNEL_NOTICES.has(input.kind)) return this.deliver(input, userIds, EMAIL_NOTICES.has(input.kind) ? ['email'] : undefined, true);
    // The summary and the reminders go where each person chose (and not at all to who switched the reminders off).
    const groups = await this.settings.groupByChannel(userIds, input.kind !== 'summary');
    await this.deliver(input, groups.in_app, undefined, true);
    await this.deliver(input, groups.both, ['email'], true);
    await this.deliver(input, groups.email, ['email'], false);
  }

  private async deliver(input: NoticeInput, userIds: string[], channels: 'email'[] | undefined, inApp: boolean): Promise<void> {
    if (!userIds.length) return;
    const notice = await this.notice(input, !!channels);
    const link = input.link ?? (input.task.id ? `/tasks/${input.task.id}` : input.kind === 'digest' ? '/tasks/team' : '/tasks');
    await this.notifications.notify({ userIds, ...notice, link, coalesce: input.coalesce, channels, inApp, purpose: 'tasks', tx: input.tx });
  }

  /** The wording of a notice: the live template filled with the task number (and its title where the notice is not e-mailed) and, for a status change, the status in each language. */
  private notice(input: NoticeInput, emailed: boolean) {
    const number = formatTaskNumber(input.task.number);
    const task = emailed ? number : `${number} — ${input.task.title}`;
    const status = input.toStatus ? STATUS_NAMES[input.toStatus] : { ar: '', en: '' };
    return this.templates.renderNotice(TASK_TEMPLATE_KEYS[input.kind], { taskNumber: number, task, count: String(input.count ?? 0), commenter: input.commenter ?? '', ...figuresOf(input) }, { ar: { status: status.ar }, en: { status: status.en } });
  }
}
