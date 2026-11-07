import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { TaskTagInput } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { TaskTagRepository } from '../../domain/contracts/task-tag.repository';
import type { TagRecord } from '../../domain/types/task.types';

const TAG = `SELECT g.id, g.org_node_id AS "orgNodeId", g.name_ar AS "nameAr", g.name_en AS "nameEn", g.is_active AS "isActive",
    n.company_id AS "companyId"
  FROM task_tags g JOIN org_nodes n ON n.id = g.org_node_id AND n.deleted_at IS NULL`;

const TAG_BY_ID = `${TAG} WHERE g.id = $1`;

@Injectable()
export class TypeOrmTaskTagRepository extends TaskTagRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async find(id: string): Promise<TagRecord | null> {
    const rows: TagRecord[] = await this.ds.query(TAG_BY_ID, [id]);
    return rows[0] ?? null;
  }

  list(companyId: string | null, nodeIds: readonly string[] | null): Promise<TagRecord[]> {
    const values: unknown[] = [];
    const where: string[] = ['TRUE'];
    if (companyId) {
      values.push(companyId);
      where.push(`n.company_id = $${values.length}`);
    }
    if (nodeIds) {
      values.push([...nodeIds]);
      where.push(`g.org_node_id = ANY($${values.length})`);
    }
    const sql = `${TAG} WHERE ${where.join(' AND ')} ORDER BY g.name_ar`;
    return this.ds.query(sql, values);
  }

  async insert(input: TaskTagInput, tx: TransactionContext): Promise<string> {
    const rows: { id: string }[] = await managerOf(tx, this.ds.manager).query(
      'INSERT INTO task_tags (org_node_id, name_ar, name_en, is_active) VALUES ($1, $2, $3, $4) RETURNING id',
      [input.orgNodeId, input.nameAr, input.nameEn, input.isActive],
    );
    return rows[0]?.id as string;
  }

  async update(id: string, input: TaskTagInput, tx: TransactionContext): Promise<void> {
    await managerOf(tx, this.ds.manager).query('UPDATE task_tags SET name_ar = $2, name_en = $3, is_active = $4, updated_at = now() WHERE id = $1', [id, input.nameAr, input.nameEn, input.isActive]);
  }

  async inUse(id: string): Promise<boolean> {
    const rows: { yes: boolean }[] = await this.ds.query('SELECT EXISTS (SELECT 1 FROM tasks WHERE tag_id = $1) AS yes', [id]);
    return rows[0]?.yes ?? false;
  }

  async remove(id: string, tx: TransactionContext): Promise<void> {
    await managerOf(tx, this.ds.manager).query('DELETE FROM task_tags WHERE id = $1', [id]);
  }

  departments(companyId: string | null, nodeIds: readonly string[] | null): Promise<{ id: string; parentId: string | null; companyId: string }[]> {
    const values: unknown[] = [];
    const where: string[] = ['n.deleted_at IS NULL'];
    if (companyId) {
      values.push(companyId);
      where.push(`n.company_id = $${values.length}`);
    }
    if (nodeIds) {
      values.push([...nodeIds]);
      where.push(`n.id = ANY($${values.length})`);
    }
    return this.ds.query(
      `SELECT n.id, n.parent_id AS "parentId", n.company_id AS "companyId" FROM org_nodes n WHERE ${where.join(' AND ')}`,
      values,
    );
  }

  async isDepartment(nodeId: string): Promise<boolean> {
    const rows: { yes: boolean }[] = await this.ds.query(
      `SELECT EXISTS (SELECT 1 FROM org_nodes n WHERE n.id = $1 AND n.deleted_at IS NULL) AS yes`,
      [nodeId],
    );
    return rows[0]?.yes ?? false;
  }
}
