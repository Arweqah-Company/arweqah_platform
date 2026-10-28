import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { COMMENT_ACTIONS, COMMENT_RELATIONS, defaultCommentMatrix, type CommentRuleMatrix } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { TaskCommentRepository } from '../../domain/contracts/task-comment.repository';
import type { CommentEdit, CommentFileRow, CommentMentionRow, CommentRow, NewComment } from '../../domain/types/task-comment.types';

const COMMENT_SELECT = `SELECT c.id, c.task_id AS "taskId", c.parent_id AS "parentId", c.author_user_id AS "authorUserId",
    COALESCE(ae.full_name, au.name) AS "authorName", c.reply_to_user_id AS "replyToUserId", COALESCE(re.full_name, ru.name) AS "replyToName",
    c.body, c.edited_at AS "editedAt", c.deleted_at AS "deletedAt", c.created_at AS "createdAt"
  FROM task_comments c
  JOIN users au ON au.id = c.author_user_id LEFT JOIN employees ae ON ae.user_id = au.id AND ae.deleted_at IS NULL
  LEFT JOIN users ru ON ru.id = c.reply_to_user_id LEFT JOIN employees re ON re.user_id = ru.id AND re.deleted_at IS NULL`;

const LIST_COMMENTS = `${COMMENT_SELECT} WHERE c.task_id = $1 ORDER BY c.created_at, c.id`;
const FIND_COMMENT = `${COMMENT_SELECT} WHERE c.task_id = $1 AND c.id = $2`;

@Injectable()
export class TypeOrmTaskCommentRepository extends TaskCommentRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  list(taskId: string): Promise<CommentRow[]> {
    return this.ds.query(LIST_COMMENTS, [taskId]);
  }

  async find(taskId: string, commentId: string): Promise<CommentRow | null> {
    const rows: CommentRow[] = await this.ds.query(FIND_COMMENT, [taskId, commentId]);
    return rows[0] ?? null;
  }

  mentionsOf(commentIds: string[]): Promise<CommentMentionRow[]> {
    if (!commentIds.length) return Promise.resolve([]);
    return this.ds.query(
      `SELECT m.comment_id AS "commentId", m.user_id AS "userId", COALESCE(e.full_name, u.name) AS name
       FROM task_comment_mentions m JOIN users u ON u.id = m.user_id LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
       WHERE m.comment_id = ANY($1) ORDER BY name`,
      [commentIds],
    );
  }

  filesOf(commentIds: string[]): Promise<CommentFileRow[]> {
    if (!commentIds.length) return Promise.resolve([]);
    return this.ds.query(
      `SELECT cf.comment_id AS "commentId", f.id AS "fileId", f.original_name AS name, f.size::int AS size, f.content_type AS "contentType"
       FROM task_comment_files cf JOIN files f ON f.id = cf.file_id WHERE cf.comment_id = ANY($1) ORDER BY f.original_name`,
      [commentIds],
    );
  }

  async insert(c: NewComment, tx: TransactionContext): Promise<string> {
    const m = managerOf(tx, this.ds.manager);
    const rows: { id: string }[] = await m.query(
      'INSERT INTO task_comments (task_id, author_user_id, parent_id, reply_to_user_id, body) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [c.taskId, c.authorUserId, c.parentId, c.replyToUserId, c.body],
    );
    const id = (rows[0] as { id: string }).id;
    await this.link(id, c.mentionIds, c.fileIds, tx);
    return id;
  }

  async edit(id: string, edit: CommentEdit, tx: TransactionContext): Promise<void> {
    const m = managerOf(tx, this.ds.manager);
    await m.query('UPDATE task_comments SET body = $2, edited_at = $3 WHERE id = $1', [id, edit.body, edit.editedAt]);
    await m.query('DELETE FROM task_comment_mentions WHERE comment_id = $1', [id]);
    await this.link(id, edit.mentionIds, [], tx);
  }

  async softDelete(id: string, deletedBy: string, at: Date, tx: TransactionContext): Promise<void> {
    await managerOf(tx, this.ds.manager).query('UPDATE task_comments SET deleted_at = $2, deleted_by_user_id = $3 WHERE id = $1', [id, at, deletedBy]);
  }

  async hasOpenTaskInCategory(userId: string, tagId: string): Promise<boolean> {
    const rows = await this.ds.query(
      `SELECT 1 FROM tasks WHERE assignee_user_id = $1 AND tag_id = $2 AND status NOT IN ('done', 'rejected') AND archived_at IS NULL LIMIT 1`,
      [userId, tagId],
    );
    return rows.length > 0;
  }

  async isMentioned(taskId: string, userId: string): Promise<boolean> {
    const rows = await this.ds.query(
      `SELECT 1 FROM task_comment_mentions m JOIN task_comments c ON c.id = m.comment_id
       WHERE c.task_id = $1 AND m.user_id = $2 AND c.deleted_at IS NULL LIMIT 1`,
      [taskId, userId],
    );
    return rows.length > 0;
  }

  async attachedFile(taskId: string, commentId: string, fileId: string): Promise<boolean> {
    const rows = await this.ds.query(
      `SELECT 1 FROM task_comment_files cf JOIN task_comments c ON c.id = cf.comment_id
       WHERE c.task_id = $1 AND c.id = $2 AND cf.file_id = $3 AND c.deleted_at IS NULL LIMIT 1`,
      [taskId, commentId, fileId],
    );
    return rows.length > 0;
  }

  async rules(companyId: string): Promise<CommentRuleMatrix> {
    const rows: { relation: string; action: string; allowed: boolean }[] = await this.ds.query('SELECT relation, action, allowed FROM task_comment_rules WHERE company_id = $1', [companyId]);
    const matrix = defaultCommentMatrix();
    for (const row of rows) {
      const relation = COMMENT_RELATIONS.find((r) => r === row.relation);
      const action = COMMENT_ACTIONS.find((a) => a === row.action);
      if (relation && action) matrix[relation][action] = row.allowed;
    }
    return matrix;
  }

  async saveRules(companyId: string, matrix: CommentRuleMatrix, tx: TransactionContext): Promise<void> {
    const cells = COMMENT_RELATIONS.flatMap((relation) => COMMENT_ACTIONS.map((action) => ({ relation, action, allowed: matrix[relation][action] })));
    await managerOf(tx, this.ds.manager).query(
      `INSERT INTO task_comment_rules (company_id, relation, action, allowed)
       SELECT $1, c.relation, c.action, c.allowed FROM unnest($2::text[], $3::text[], $4::boolean[]) AS c(relation, action, allowed)
       ON CONFLICT (company_id, relation, action) DO UPDATE SET allowed = EXCLUDED.allowed`,
      [companyId, cells.map((c) => c.relation), cells.map((c) => c.action), cells.map((c) => c.allowed)],
    );
  }

  private async link(commentId: string, mentionIds: string[], fileIds: string[], tx: TransactionContext): Promise<void> {
    const m = managerOf(tx, this.ds.manager);
    for (const userId of mentionIds) await m.query('INSERT INTO task_comment_mentions (comment_id, user_id) VALUES ($1, $2)', [commentId, userId]);
    for (const fileId of fileIds) await m.query('INSERT INTO task_comment_files (comment_id, file_id) VALUES ($1, $2)', [commentId, fileId]);
  }
}
