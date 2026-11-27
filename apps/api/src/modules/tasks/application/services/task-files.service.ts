import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorePermission as P, type AddTaskFilesInput, TaskFileDto, TaskFileKind, TaskStatus } from '@arweqah-platform/shared';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import { ForbiddenError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { FilesService } from '../../../../core/files/application/files.service';
import { TaskFileRepository } from '../../domain/contracts/task-file.repository';
import { TaskRepository } from '../../domain/contracts/task.repository';
import { TaskFilesNotAllowedError, TaskNotFoundError } from '../../domain/errors/task.errors';
import type { TaskFileRow } from '../../domain/types/task-file.types';
import type { TaskRow, TaskViewer } from '../../domain/types/task.types';
import { TASK_AUDIT } from '../messages/task.messages';
import { TaskAccessPolicy } from '../policies/task-access.policy';

/** The status moves that finish the work; only they carry delivery files. */
const FINISHING: TaskStatus[] = ['done', 'awaiting_review'];

/** The event and the audit action of each kind of attachment. */
const RECORD = { reference: { event: 'file_added', audit: TASK_AUDIT.filesAdded }, delivery: { event: 'delivery_added', audit: TASK_AUDIT.deliveryAdded } } as const;

/**
 * Files on tasks: the reference files a task is made with (or given later) and the delivery files the doer hands in, also with the move that finishes the
 * work. The key says the button exists; the relation to the task says for which tasks (see TaskAccessPolicy). Every file must be the sender's own upload.
 */
@Injectable()
export class TaskFilesService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly stored: TaskFileRepository,
    private readonly access: TaskAccessPolicy,
    private readonly files: FilesService,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  /** The files of a task as the viewer sees them, each with whether they may take it off. */
  async listFor(viewer: TaskViewer, task: TaskRow): Promise<TaskFileDto[]> {
    return (await this.stored.list(task.id)).map((f) => this.toDto(f, this.access.mayRemoveFile(viewer, task, f.addedByUserId)));
  }

  /** Before a new task is saved: the sender holds the key and the files are theirs. */
  async assertAttachable(viewer: TaskViewer, fileIds: string[]): Promise<void> {
    if (!fileIds.length) return;
    if (viewer.scopes[P.TasksFileAdd] == null) throw new ForbiddenError();
    await this.assertOwned(viewer.userId, fileIds);
  }

  /** The reference files of a task that is being made (the «created» entry of its history already says it began). */
  async storeOnCreate(taskId: string, viewer: TaskViewer, fileIds: string[], tx: TransactionContext): Promise<void> {
    if (fileIds.length) await this.stored.add({ taskId, fileIds, kind: 'reference', addedByUserId: viewer.userId }, tx);
  }

  async addReference(viewer: TaskViewer, id: string, input: AddTaskFilesInput): Promise<void> {
    const task = await this.openTask(viewer, id);
    if (!this.access.mayAddFiles(viewer, task)) throw new ForbiddenError();
    await this.attach(viewer, task, 'reference', input.fileIds);
  }

  async deliver(viewer: TaskViewer, id: string, input: AddTaskFilesInput): Promise<void> {
    const task = await this.openTask(viewer, id);
    if (!this.access.mayDeliver(viewer, task)) throw new ForbiddenError();
    await this.attach(viewer, task, 'delivery', input.fileIds);
  }

  /** Before a move: files may travel only with a move that finishes the work, from the doer who holds the delivery key. */
  async assertDeliverable(viewer: TaskViewer, task: TaskRow, to: TaskStatus, fileIds: string[]): Promise<void> {
    if (!fileIds.length) return;
    if (!FINISHING.includes(to) || task.status !== 'in_progress') throw new TaskFilesNotAllowedError();
    if (!this.access.mayDeliver(viewer, task)) throw new ForbiddenError();
    await this.assertOwned(viewer.userId, fileIds);
  }

  /** The delivery files that came with a move, inside its transaction; returns how many were new (for `auditDelivery` once the move is saved). */
  async storeDelivery(viewer: TaskViewer, task: TaskRow, fileIds: string[], tx: TransactionContext): Promise<number> {
    return fileIds.length ? this.record({ viewer, taskId: task.id, kind: 'delivery', fileIds }, tx) : 0;
  }

  auditDelivery(actorId: string, taskId: string, files: number): void {
    if (files > 0) this.audit(actorId, RECORD.delivery.audit, taskId, { files });
  }

  async remove(viewer: TaskViewer, id: string, fileId: string): Promise<void> {
    const task = await this.openTask(viewer, id);
    const file = await this.stored.find(id, fileId);
    if (!file) throw new TaskNotFoundError();
    if (!this.access.mayRemoveFile(viewer, task, file.addedByUserId)) throw new ForbiddenError();
    await this.tx.run(async (tx) => {
      await this.stored.remove(id, fileId, tx);
      await this.tasks.appendEvent({ taskId: id, type: 'file_removed', actorUserId: viewer.userId, note: file.name }, tx);
    });
    this.audit(viewer.userId, TASK_AUDIT.fileRemoved, id, { kind: file.kind });
  }

  /** The stream of a file of a task the viewer may see. */
  async open(viewer: TaskViewer, id: string, fileId: string) {
    const file = await this.granted(viewer, id, fileId);
    return { file, opened: await this.files.open(file) };
  }

  /** The same file for the preview window (images, PDF, Word, Excel, PowerPoint). */
  async preview(viewer: TaskViewer, id: string, fileId: string) {
    const file = await this.granted(viewer, id, fileId);
    return { file, stream: await this.files.preview(file) };
  }

  // -------------------------------------------------------------------- helpers

  private async granted(viewer: TaskViewer, id: string, fileId: string) {
    this.access.assertCanView(viewer, await this.tasks.find(id, viewer.userId));
    if (!(await this.stored.find(id, fileId))) throw new TaskNotFoundError();
    return this.files.getGranted(fileId);
  }

  private async openTask(viewer: TaskViewer, id: string): Promise<TaskRow> {
    const row = await this.tasks.find(id, viewer.userId);
    this.access.assertCanView(viewer, row);
    return row as TaskRow;
  }

  private async attach(viewer: TaskViewer, task: TaskRow, kind: TaskFileKind, fileIds: string[]): Promise<void> {
    await this.assertOwned(viewer.userId, fileIds);
    const added = await this.tx.run((tx) => this.record({ viewer, taskId: task.id, kind, fileIds }, tx));
    if (added > 0) this.audit(viewer.userId, RECORD[kind].audit, task.id, { files: added });
  }

  /** Links the files and writes the history entry (names only); returns how many were new. */
  private async record({ viewer, taskId, kind, fileIds }: { viewer: TaskViewer; taskId: string; kind: TaskFileKind; fileIds: string[] }, tx: TransactionContext): Promise<number> {
    const names = await this.stored.add({ taskId, fileIds, kind, addedByUserId: viewer.userId }, tx);
    if (names.length) await this.tasks.appendEvent({ taskId, type: RECORD[kind].event, actorUserId: viewer.userId, note: names.join(', ') }, tx);
    return names.length;
  }

  private async assertOwned(userId: string, fileIds: string[]): Promise<void> {
    for (const id of fileIds) await this.files.getOwned(id, userId);
  }

  private toDto(f: TaskFileRow, canRemove: boolean): TaskFileDto {
    return { id: f.fileId, name: f.name, size: f.size, contentType: f.contentType, kind: f.kind, addedBy: { id: f.addedByUserId, name: f.addedByName }, addedAt: f.addedAt.toISOString(), canRemove };
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'task', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
