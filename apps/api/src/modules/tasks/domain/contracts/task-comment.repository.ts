import type { CommentRuleMatrix } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { CommentEdit, CommentFileRow, CommentMentionRow, CommentRow, NewComment } from '../types/task-comment.types';

/** The conversations of tasks and each company's matrix of who may do what in them. */
export abstract class TaskCommentRepository {
  /** Every comment of the task, oldest first (deleted ones too: the screen shows a mark in their place). */
  abstract list(taskId: string): Promise<CommentRow[]>;
  abstract find(taskId: string, commentId: string): Promise<CommentRow | null>;
  abstract mentionsOf(commentIds: string[]): Promise<CommentMentionRow[]>;
  abstract filesOf(commentIds: string[]): Promise<CommentFileRow[]>;
  abstract insert(comment: NewComment, tx: TransactionContext): Promise<string>;
  abstract edit(id: string, edit: CommentEdit, tx: TransactionContext): Promise<void>;
  /** The text stays in the database for the audit; the screen never gets it back. */
  abstract softDelete(id: string, deletedBy: string, at: Date, tx: TransactionContext): Promise<void>;

  /** Does the person have an open task (not done, rejected or archived) of this category? */
  abstract hasOpenTaskInCategory(userId: string, tagId: string): Promise<boolean>;
  /** Does a live comment of the task name the person? */
  abstract isMentioned(taskId: string, userId: string): Promise<boolean>;
  /** Is the file attached to this (live) comment of the task? */
  abstract attachedFile(taskId: string, commentId: string, fileId: string): Promise<boolean>;

  /** The company's matrix (the defaults where nothing was saved). */
  abstract rules(companyId: string): Promise<CommentRuleMatrix>;
  abstract saveRules(companyId: string, matrix: CommentRuleMatrix, tx: TransactionContext): Promise<void>;
}
