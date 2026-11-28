import type { TaskFileKind } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { TaskFileRow } from '../types/task-file.types';

/** The files kept with tasks (reference files and delivery files). */
export abstract class TaskFileRepository {
  /** Every file of the task, oldest first. */
  abstract list(taskId: string): Promise<TaskFileRow[]>;
  /** One file of the task, or null when it is not attached to it. */
  abstract find(taskId: string, fileId: string, tx?: TransactionContext): Promise<TaskFileRow | null>;
  /** Attaches the files; a file already on the task is left as it is. Returns the names of the files newly attached. */
  abstract add(input: { taskId: string; fileIds: string[]; kind: TaskFileKind; addedByUserId: string }, tx: TransactionContext): Promise<string[]>;
  abstract remove(taskId: string, fileId: string, tx: TransactionContext): Promise<void>;
}
