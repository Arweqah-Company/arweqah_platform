import type { TaskFileKind } from '@arweqah-platform/shared';

/** A file of a task with its stored facts and who attached it. */
export interface TaskFileRow {
  fileId: string;
  name: string;
  size: number;
  contentType: string;
  kind: TaskFileKind;
  addedByUserId: string;
  addedByName: string;
  addedAt: Date;
}
