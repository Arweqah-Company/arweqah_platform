import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CreateCommentInput, EditCommentInput, MentionableDto, TaskConversationDto } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { FilesService } from '../../../../core/files/application/files.service';
import { TaskCommentRepository } from '../../domain/contracts/task-comment.repository';
import { TaskDirectory } from '../../domain/contracts/task-directory.port';
import {
  TaskCommentAlreadyDeletedError,
  TaskCommentClosedError,
  TaskCommentEditExpiredError,
  TaskCommentNotAllowedError,
  TaskCommentNotFoundError,
  TaskCommentReplyInvalidError,
} from '../../domain/errors/task-comment.errors';
import { withinEditWindow } from '../../domain/rules/task-comment-access.rules';
import type { CommentRow } from '../../domain/types/task-comment.types';
import type { TaskViewer } from '../../domain/types/task.types';
import { TASK_AUDIT } from '../messages/task.messages';
import { TaskCommentAccessPolicy, type CommentContext } from '../policies/task-comment-access.policy';
import { TaskCommentInputPolicy } from '../policies/task-comment-input.policy';
import { TaskCommentTransformer } from '../transformers/task-comment.transformer';

/** The conversation of a task: comments, replies, files and mentions. Every action asks the key and the company's matrix (see TaskCommentAccessPolicy). */
@Injectable()
export class TaskCommentService {
  constructor(
    private readonly comments: TaskCommentRepository,
    private readonly access: TaskCommentAccessPolicy,
    private readonly input: TaskCommentInputPolicy,
    private readonly transformer: TaskCommentTransformer,
    private readonly directory: TaskDirectory,
    private readonly files: FilesService,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  async conversation(viewer: TaskViewer, taskId: string): Promise<TaskConversationDto> {
    return this.render(await this.access.open(viewer, taskId));
  }

  /** A first-level comment. */
  async add(viewer: TaskViewer, taskId: string, body: CreateCommentInput): Promise<TaskConversationDto> {
    const ctx = await this.access.open(viewer, taskId);
    const mentionIds = await this.input.assertPostable(ctx, 'write', body);
    return this.store(ctx, { ...body, parentId: null, replyToUserId: null, mentionIds });
  }

  /** An answer to a comment. An answer to an answer is filed under the first comment and names whom it answers. */
  async reply(viewer: TaskViewer, taskId: string, commentId: string, body: CreateCommentInput): Promise<TaskConversationDto> {
    const ctx = await this.access.open(viewer, taskId);
    const target = await this.comments.find(taskId, commentId);
    if (!target || target.deletedAt) throw new TaskCommentReplyInvalidError();
    const mentionIds = await this.input.assertPostable(ctx, 'reply', body);
    return this.store(ctx, { ...body, parentId: target.parentId ?? target.id, replyToUserId: target.authorUserId, mentionIds });
  }

  async edit(viewer: TaskViewer, taskId: string, commentId: string, body: EditCommentInput): Promise<TaskConversationDto> {
    const ctx = await this.access.open(viewer, taskId);
    const row = await this.liveComment(ctx, commentId);
    if (row.authorUserId !== viewer.userId) throw new TaskCommentNotAllowedError('edit another person’s comment');
    this.input.assertMay(ctx, 'edit_own');
    this.assertInWindow(ctx, row);
    const previous = (await this.comments.mentionsOf([row.id])).map((m) => m.userId);
    const mentionIds = await this.input.mentionIds(ctx, body.body, previous);
    await this.tx.run((tx) => this.comments.edit(row.id, { body: body.body, editedAt: ctx.now, mentionIds }, tx));
    this.audit(viewer.userId, TASK_AUDIT.commentEdited, taskId, { commentId: row.id, mentions: mentionIds.length });
    return this.render(ctx);
  }

  async remove(viewer: TaskViewer, taskId: string, commentId: string): Promise<TaskConversationDto> {
    const ctx = await this.access.open(viewer, taskId);
    const row = await this.liveComment(ctx, commentId);
    if (!(this.access.holdsDeleteAny(ctx) || this.mayDeleteOwn(ctx, row))) throw new TaskCommentNotAllowedError('delete this comment');
    await this.tx.run((tx) => this.comments.softDelete(row.id, viewer.userId, ctx.now, tx));
    this.audit(viewer.userId, TASK_AUDIT.commentDeleted, taskId, { commentId: row.id, byAuthor: row.authorUserId === viewer.userId });
    return this.render(ctx);
  }

  /** The stream of a file of a live comment, for somebody who may read the conversation. */
  async openFile(viewer: TaskViewer, taskId: string, commentId: string, fileId: string) {
    await this.access.open(viewer, taskId);
    if (!(await this.comments.attachedFile(taskId, commentId, fileId))) throw new TaskCommentNotFoundError();
    const file = await this.files.getGranted(fileId);
    return { file, opened: await this.files.open(file) };
  }

  /** The @ list: active employees of the task's company, for somebody who may mention. */
  async mentionables(viewer: TaskViewer, taskId: string, search?: string): Promise<MentionableDto[]> {
    const ctx = await this.access.open(viewer, taskId);
    this.input.assertMay(ctx, 'mention');
    return (await this.directory.mentionables(ctx.task.companyId, search)).map((p) => ({ id: p.userId, name: p.name }));
  }

  // -------------------------------------------------------------------- helpers

  private async store(ctx: CommentContext, comment: { body: string; fileIds: string[]; parentId: string | null; replyToUserId: string | null; mentionIds: string[] }): Promise<TaskConversationDto> {
    const id = await this.tx.run((tx) => this.comments.insert({ taskId: ctx.task.id, authorUserId: ctx.viewer.userId, ...comment }, tx));
    this.audit(ctx.viewer.userId, TASK_AUDIT.commentAdded, ctx.task.id, { commentId: id, reply: comment.parentId !== null, files: comment.fileIds.length, mentions: comment.mentionIds.length });
    return this.render(ctx);
  }

  private async liveComment(ctx: CommentContext, commentId: string): Promise<CommentRow> {
    const row = await this.comments.find(ctx.task.id, commentId);
    if (!row) throw new TaskCommentNotFoundError();
    if (ctx.closed) throw new TaskCommentClosedError();
    if (row.deletedAt) throw new TaskCommentAlreadyDeletedError();
    return row;
  }

  private assertInWindow(ctx: CommentContext, row: CommentRow): void {
    if (!withinEditWindow(row.createdAt, ctx.now, ctx.policy.commentEditMinutes)) throw new TaskCommentEditExpiredError(ctx.policy.commentEditMinutes);
  }

  private mayDeleteOwn(ctx: CommentContext, row: CommentRow): boolean {
    if (row.authorUserId !== ctx.viewer.userId || !ctx.may('delete_own')) return false;
    this.assertInWindow(ctx, row);
    return true;
  }

  private async render(ctx: CommentContext): Promise<TaskConversationDto> {
    const rows = await this.comments.list(ctx.task.id);
    const ids = rows.map((r) => r.id);
    const [mentions, files] = await Promise.all([this.comments.mentionsOf(ids), this.comments.filesOf(ids)]);
    return this.transformer.toConversation(ctx, { rows, mentions, files });
  }

  private audit(actorId: string, action: string, taskId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'task', entityId: taskId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
