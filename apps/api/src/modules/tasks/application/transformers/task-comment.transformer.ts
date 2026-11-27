import { Injectable } from '@nestjs/common';
import { CorePermission, formatTaskNumber, type ReactionSummaryDto, type TaskCommentDto, type TaskConversationDto } from '@arweqah-platform/shared';
import type { CommentFileRow, CommentMentionRow, CommentRow } from '../../domain/types/task-comment.types';
import { withinEditWindow } from '../../domain/rules/task-comment-access.rules';
import type { CommentContext } from '../policies/task-comment-access.policy';

interface Parts {
  rows: CommentRow[];
  mentions: CommentMentionRow[];
  files: CommentFileRow[];
  reactions: Map<string, ReactionSummaryDto[]>;
}

@Injectable()
export class TaskCommentTransformer {
  toConversation(ctx: CommentContext, parts: Parts): TaskConversationDto {
    const open = !ctx.closed;
    return {
      task: { id: ctx.task.id, number: formatTaskNumber(ctx.task.number), title: ctx.task.title },
      comments: parts.rows.map((row) => this.toComment(ctx, row, parts)),
      can: { write: open && ctx.may('write'), reply: open && ctx.may('reply'), upload: open && ctx.may('upload'), mention: open && ctx.may('mention') },
      maxFiles: ctx.policy.commentMaxFiles,
      locked: ctx.closed,
      isOutsider: ctx.isOutsider,
    };
  }

  private toComment(ctx: CommentContext, row: CommentRow, parts: Parts): TaskCommentDto {
    const deleted = row.deletedAt !== null;
    return {
      id: row.id,
      parentId: row.parentId,
      author: { id: row.authorUserId, name: row.authorName },
      replyTo: row.replyToUserId ? { id: row.replyToUserId, name: row.replyToName ?? '' } : null,
      ...(deleted ? { body: '', mentions: [], files: [] } : this.content(row, parts)),
      createdAt: row.createdAt.toISOString(),
      isEdited: row.editedAt !== null && !deleted,
      isDeleted: deleted,
      ...this.state(ctx, row, parts),
    };
  }

  /** What a person may do with a comment now, and its reactions (a deleted or locked comment offers nothing to change). */
  private state(ctx: CommentContext, row: CommentRow, parts: Parts): Pick<TaskCommentDto, 'mayEdit' | 'mayDelete' | 'reactions'> {
    if (row.deletedAt !== null) return { mayEdit: false, mayDelete: false, reactions: [] };
    return {
      mayEdit: !ctx.closed && this.isOwnWithinWindow(ctx, row, 'edit_own'),
      mayDelete: !ctx.closed && (this.isOwnWithinWindow(ctx, row, 'delete_own') || ctx.holds(CorePermission.TasksCommentDeleteAny)),
      reactions: parts.reactions.get(row.id) ?? [],
    };
  }

  /** What a live comment carries: its text, the people it names and its files. */
  private content(row: CommentRow, parts: Parts): Pick<TaskCommentDto, 'body' | 'mentions' | 'files'> {
    return {
      body: row.body,
      mentions: parts.mentions.filter((m) => m.commentId === row.id).map((m) => ({ id: m.userId, name: m.name })),
      files: parts.files.filter((f) => f.commentId === row.id).map((f) => ({ id: f.fileId, name: f.name, size: f.size, contentType: f.contentType })),
    };
  }

  private isOwnWithinWindow(ctx: CommentContext, row: CommentRow, action: 'edit_own' | 'delete_own'): boolean {
    return row.authorUserId === ctx.viewer.userId && ctx.may(action) && withinEditWindow(row.createdAt, ctx.now, ctx.policy.commentEditMinutes);
  }
}
