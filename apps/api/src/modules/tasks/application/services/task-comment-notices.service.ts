import { Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../common/application/transaction-runner';
import { TaskDirectory } from '../../domain/contracts/task-directory.port';
import { TaskRepository } from '../../domain/contracts/task.repository';
import type { TaskNoticeKind } from '../messages/task.messages';
import type { CommentContext } from '../policies/task-comment-access.policy';
import { TaskNotifier } from './task-notifier.service';

export interface PostedComment {
  mentionIds: string[];
  replyToUserId: string | null;
}

/**
 * Who hears about a new comment, each person once and by the strongest reason: the people it mentions, whoever it answers, the assignee and
 * the person who gave the task, then the followers (who are told once while an earlier notice is still unread). Nobody is told of their own comment.
 */
@Injectable()
export class TaskCommentNotices {
  constructor(
    private readonly notifier: TaskNotifier,
    private readonly directory: TaskDirectory,
    private readonly tasks: TaskRepository,
  ) {}

  async send(ctx: CommentContext, posted: PostedComment, tx: TransactionContext): Promise<void> {
    const author = ctx.viewer.userId;
    const commenter = (await this.directory.person(author))?.name ?? '';
    const told = new Set<string>([author]);
    const take = (ids: (string | null)[]): string[] => {
      const fresh = [...new Set(ids.filter((id): id is string => !!id && !told.has(id)))];
      fresh.forEach((id) => told.add(id));
      return fresh;
    };
    const groups: [TaskNoticeKind, string[], boolean][] = [
      ['commentMentioned', take(posted.mentionIds), false],
      ['commentReplied', take([posted.replyToUserId]), false],
      ['commentAdded', take([ctx.task.assigneeUserId, ctx.task.creatorUserId]), false],
      ['commentAdded', take(await this.tasks.followerIds(ctx.task.id)), true],
    ];
    for (const [kind, recipients, coalesce] of groups) {
      await this.notifier.send({ kind, task: ctx.task, recipients, actorUserId: author, commenter, link: `/tasks/${ctx.task.id}/conversation`, coalesce, tx });
    }
  }

  /** An edit that names somebody new tells only them. */
  async sendMentions(ctx: CommentContext, userIds: string[], tx: TransactionContext): Promise<void> {
    const commenter = (await this.directory.person(ctx.viewer.userId))?.name ?? '';
    await this.notifier.send({ kind: 'commentMentioned', task: ctx.task, recipients: userIds, actorUserId: ctx.viewer.userId, commenter, link: `/tasks/${ctx.task.id}/conversation`, tx });
  }
}
