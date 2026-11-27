import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { TaskFileKind } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { TaskFileRepository } from '../../domain/contracts/task-file.repository';
import type { TaskFileRow } from '../../domain/types/task-file.types';

const SELECT = `SELECT tf.file_id AS "fileId", f.original_name AS name, f.size::int AS size, f.content_type AS "contentType", tf.kind,
    tf.added_by_user_id AS "addedByUserId", COALESCE(e.full_name, u.name) AS "addedByName", tf.created_at AS "addedAt"
  FROM task_files tf JOIN files f ON f.id = tf.file_id JOIN users u ON u.id = tf.added_by_user_id
  LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL`;

const LIST_FILES = `${SELECT} WHERE tf.task_id = $1 ORDER BY tf.created_at, f.original_name`;
const FIND_FILE = `${SELECT} WHERE tf.task_id = $1 AND tf.file_id = $2`;

@Injectable()
export class TypeOrmTaskFileRepository extends TaskFileRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  list(taskId: string): Promise<TaskFileRow[]> {
    return this.ds.query(LIST_FILES, [taskId]);
  }

  async find(taskId: string, fileId: string, tx?: TransactionContext): Promise<TaskFileRow | null> {
    const rows: TaskFileRow[] = await managerOf(tx, this.ds.manager).query(FIND_FILE, [taskId, fileId]);
    return rows[0] ?? null;
  }

  async add(input: { taskId: string; fileIds: string[]; kind: TaskFileKind; addedByUserId: string }, tx: TransactionContext): Promise<string[]> {
    const rows: { name: string }[] = await managerOf(tx, this.ds.manager).query(
      `WITH added AS (
         INSERT INTO task_files (task_id, file_id, kind, added_by_user_id)
         SELECT $1::uuid, f.id, $3::varchar, $4::uuid FROM unnest($2::uuid[]) AS f(id)
         ON CONFLICT (task_id, file_id) DO NOTHING RETURNING file_id)
       SELECT f.original_name AS name FROM added a JOIN files f ON f.id = a.file_id ORDER BY f.original_name`,
      [input.taskId, input.fileIds, input.kind, input.addedByUserId],
    );
    return rows.map((r) => r.name);
  }

  async remove(taskId: string, fileId: string, tx: TransactionContext): Promise<void> {
    await managerOf(tx, this.ds.manager).query('DELETE FROM task_files WHERE task_id = $1 AND file_id = $2', [taskId, fileId]);
  }
}
