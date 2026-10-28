import { Injectable } from '@nestjs/common';
import { mentionedIn, type CommentAction } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { FilesService } from '../../../../core/files/application/files.service';
import { TaskDirectory } from '../../domain/contracts/task-directory.port';
import {
  TaskCommentClosedError,
  TaskCommentEmptyError,
  TaskCommentFileInvalidError,
  TaskCommentMentionInvalidError,
  TaskCommentNotAllowedError,
  TaskCommentTooManyFilesError,
} from '../../domain/errors/task-comment.errors';
import { hasContent } from '../../domain/rules/task-comment-access.rules';
import type { CommentContext } from './task-comment-access.policy';

/** What a new comment (or a reply) must satisfy before it is stored. */
@Injectable()
export class TaskCommentInputPolicy {
  constructor(
    private readonly directory: TaskDirectory,
    private readonly files: FilesService,
  ) {}

  /** Checks the action, the content, the files and the mentions; returns the ids of the people mentioned. */
  async assertPostable(ctx: CommentContext, action: Extract<CommentAction, 'write' | 'reply'>, input: { body: string; fileIds: string[] }): Promise<string[]> {
    if (ctx.closed) throw new TaskCommentClosedError();
    this.assertMay(ctx, action);
    if (!hasContent(input.body, input.fileIds.length)) throw new TaskCommentEmptyError();
    await this.assertFiles(ctx, input.fileIds);
    return this.mentionIds(ctx, input.body, []);
  }

  assertMay(ctx: CommentContext, action: CommentAction): void {
    if (!ctx.may(action)) throw new TaskCommentNotAllowedError(action.replace('_', ' '));
  }

  /** The people a text names, each of whom must be an active employee of the task's company; naming someone new needs the mention action. */
  async mentionIds(ctx: CommentContext, body: string, alreadyMentioned: string[]): Promise<string[]> {
    const ids = mentionedIn(body);
    if (!ids.length) return [];
    if (ids.some((id) => !alreadyMentioned.includes(id))) this.assertMay(ctx, 'mention');
    const people = await this.directory.people(ids);
    if (ids.some((id) => people.get(id)?.companyId !== ctx.task.companyId)) throw new TaskCommentMentionInvalidError();
    return ids;
  }

  private async assertFiles(ctx: CommentContext, fileIds: string[]): Promise<void> {
    if (!fileIds.length) return;
    this.assertMay(ctx, 'upload');
    if (new Set(fileIds).size !== fileIds.length) throw new TaskCommentFileInvalidError();
    if (fileIds.length > ctx.policy.commentMaxFiles) throw new TaskCommentTooManyFilesError(ctx.policy.commentMaxFiles);
    for (const id of fileIds) {
      try {
        await this.files.getOwned(id, ctx.viewer.userId);
      } catch (error) {
        if (error instanceof NotFoundError) throw new TaskCommentFileInvalidError();
        throw error;
      }
    }
  }
}
