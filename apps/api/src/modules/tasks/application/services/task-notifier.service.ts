import { Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../common/application/transaction-runner';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import type { TaskRow } from '../../domain/types/task.types';
import { EMAIL_NOTICES, taskNoticeFor, type TaskNoticeKind } from '../messages/task.messages';
import type { TaskStatus } from '@arweqah-platform/shared';

/** Sends the notices of a task (in the app, and by e-mail for the important ones) inside the caller's transaction. Nobody is told about their own change. */
@Injectable()
export class TaskNotifier {
  constructor(private readonly notifications: NotificationsService) {}

  async send(input: {
    kind: TaskNoticeKind;
    task: Pick<TaskRow, 'id' | 'title'> & { number: string | number };
    recipients: (string | null)[];
    actorUserId?: string | null;
    toStatus?: TaskStatus;
    count?: number;
    tx?: TransactionContext;
  }): Promise<void> {
    const userIds = [...new Set(input.recipients.filter((id): id is string => !!id))].filter((id) => id !== input.actorUserId);
    if (!userIds.length) return;
    const notice = taskNoticeFor(input.kind, { number: input.task.number, title: input.task.title, toStatus: input.toStatus, count: input.count });
    await this.notifications.notify({ userIds, ...notice, link: input.task.id ? `/tasks/${input.task.id}` : input.kind === 'digest' ? '/tasks/team' : '/tasks', channels: EMAIL_NOTICES.has(input.kind) ? ['email'] : undefined, tx: input.tx });
  }
}
