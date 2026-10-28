import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { TaskPolicyInput } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { TaskPolicyRepository } from '../../domain/contracts/task-policy.repository';
import type { PolicyRecord } from '../../domain/types/task.types';

const COLUMNS = `company_id AS "companyId", objection_working_days AS "objectionWorkingDays", stale_days AS "staleDays", backdate_days AS "backdateDays",
  urgent_days AS "urgentDays", reminder_days_before AS "reminderDaysBefore", digest_weekday AS "digestWeekday", standalone_retention_days AS "standaloneRetentionDays",
  comment_max_files AS "commentMaxFiles", comment_edit_minutes AS "commentEditMinutes", comment_lock_days AS "commentLockDays"`;

const SELECT_ONE = `SELECT ${COLUMNS} FROM task_policies WHERE company_id = $1`;
const SELECT_ALL = `SELECT ${COLUMNS} FROM task_policies`;

@Injectable()
export class TypeOrmTaskPolicyRepository extends TaskPolicyRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async find(companyId: string): Promise<PolicyRecord | null> {
    const rows: PolicyRecord[] = await this.ds.query(SELECT_ONE, [companyId]);
    return rows[0] ?? null;
  }

  all(): Promise<PolicyRecord[]> {
    return this.ds.query(SELECT_ALL);
  }

  async save(companyId: string, p: TaskPolicyInput, tx: TransactionContext): Promise<void> {
    await managerOf(tx, this.ds.manager).query(
      `INSERT INTO task_policies (company_id, objection_working_days, stale_days, backdate_days, urgent_days, reminder_days_before, digest_weekday, standalone_retention_days,
         comment_max_files, comment_edit_minutes, comment_lock_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (company_id) DO UPDATE SET objection_working_days = $2, stale_days = $3, backdate_days = $4, urgent_days = $5,
         reminder_days_before = $6, digest_weekday = $7, standalone_retention_days = $8,
         comment_max_files = $9, comment_edit_minutes = $10, comment_lock_days = $11, updated_at = now()`,
      [companyId, p.objectionWorkingDays, p.staleDays, p.backdateDays, p.urgentDays, p.reminderDaysBefore, p.digestWeekday, p.standaloneRetentionDays, p.commentMaxFiles, p.commentEditMinutes, p.commentLockDays],
    );
  }
}
