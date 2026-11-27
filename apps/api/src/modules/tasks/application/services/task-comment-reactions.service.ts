import { Injectable } from '@nestjs/common';
import type { ReactionInput } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { ReactionsService } from '../../../../core/reactions/application/services/reactions.service';
import { TaskCommentRepository } from '../../domain/contracts/task-comment.repository';
import { TaskCommentNotFoundError } from '../../domain/errors/task-comment.errors';
import type { TaskViewer } from '../../domain/types/task.types';
import { TaskCommentAccessPolicy, type CommentContext } from '../policies/task-comment-access.policy';
import { TaskCommentNotices } from './task-comment-notices.service';

/**
 * Reactions on the comments of a task (FR-206, FR-207). Whoever may read the conversation (the company's matrix «read» cell of one of their
 * relations, and the key) may react, also when the conversation is locked: a reaction changes nothing in it. The author hears once about each
 * new reaction, never about a change or a removal.
 */
@Injectable()
export class TaskCommentReactionsService {
  constructor(
    private readonly comments: TaskCommentRepository,
    private readonly access: TaskCommentAccessPolicy,
    private readonly reactions: ReactionsService,
    private readonly notices: TaskCommentNotices,
    private readonly tx: TransactionRunner,
  ) {}

  async react(viewer: TaskViewer, taskId: string, commentId: string, input: ReactionInput): Promise<void> {
    const { ctx, authorUserId } = await this.target(viewer, taskId, commentId);
    await this.tx.run(async (tx) => {
      const first = await this.reactions.set({ type: 'task_comment', id: commentId }, viewer.userId, input.reaction, tx);
      if (first) await this.notices.sendReacted(ctx, authorUserId, tx);
    });
  }

  async unreact(viewer: TaskViewer, taskId: string, commentId: string): Promise<void> {
    await this.target(viewer, taskId, commentId);
    await this.tx.run((tx) => this.reactions.clear({ type: 'task_comment', id: commentId }, viewer.userId, tx));
  }

  /** The conversation (404 for somebody who may not read it) and a live comment of it (404 for a missing or deleted one). */
  private async target(viewer: TaskViewer, taskId: string, commentId: string): Promise<{ ctx: CommentContext; authorUserId: string }> {
    const ctx = await this.access.open(viewer, taskId);
    const row = await this.comments.find(taskId, commentId);
    if (!row || row.deletedAt) throw new TaskCommentNotFoundError();
    return { ctx, authorUserId: row.authorUserId };
  }
}
