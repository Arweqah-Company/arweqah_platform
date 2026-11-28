import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { TASK_NOTICE_DEFAULTS, type TaskNoticeChannel, type TaskNoticeSettings } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { TaskNoticePreferenceRepository } from '../../domain/contracts/task-notice-preference.repository';
import { TaskNoticePreference } from '../../domain/entities/task.entities';
import type { TaskSummaryRecipient } from '../../domain/types/task.types';

const toSettings = (row: TaskNoticePreference): TaskNoticeSettings => ({ channel: row.channel as TaskNoticeChannel, digestEnabled: row.digestEnabled, digestHour: row.digestHour, remindersEnabled: row.remindersEnabled });

/** Who gets a summary now: a person without a row has the defaults; the counts are the tasks assigned to them that are still open. */
const DIGEST_RECIPIENTS = `
  SELECT u.id AS "userId", COALESCE(p.channel, $3) AS channel, c.open, c.due_today AS "dueToday", c.overdue
  FROM users u
  LEFT JOIN task_notice_preferences p ON p.user_id = u.id
  CROSS JOIN LATERAL (
    SELECT count(*)::int AS open, (count(*) FILTER (WHERE t.due_date = $2::date))::int AS due_today, (count(*) FILTER (WHERE t.due_date < $2::date))::int AS overdue
    FROM tasks t
    WHERE t.assignee_user_id = u.id AND t.archived_at IS NULL AND t.deleted_at IS NULL AND t.status IN ('todo', 'in_progress', 'awaiting_review')
  ) c
  WHERE u.is_active AND COALESCE(p.digest_enabled, true) AND COALESCE(p.digest_hour, $4) <= $1
    AND (p.digest_last_sent_on IS NULL OR p.digest_last_sent_on < $2::date)`;

/** Marks the day for one person only if it is not marked yet (a row is made for a person with none); a row comes back only for the sweep that really took it. */
const CLAIM_DIGEST = `
  INSERT INTO task_notice_preferences (user_id, digest_last_sent_on) VALUES ($1, $2::date)
  ON CONFLICT (user_id) DO UPDATE SET digest_last_sent_on = EXCLUDED.digest_last_sent_on
  WHERE task_notice_preferences.digest_last_sent_on IS NULL OR task_notice_preferences.digest_last_sent_on < EXCLUDED.digest_last_sent_on
  RETURNING user_id`;

@Injectable()
export class TypeOrmTaskNoticePreferenceRepository extends TaskNoticePreferenceRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async find(userId: string): Promise<TaskNoticeSettings | null> {
    const row = await this.ds.getRepository(TaskNoticePreference).findOneBy({ userId });
    return row ? toSettings(row) : null;
  }

  async findMany(userIds: string[]): Promise<Map<string, TaskNoticeSettings>> {
    if (!userIds.length) return new Map();
    const rows = await this.ds.getRepository(TaskNoticePreference).findBy({ userId: In(userIds) });
    return new Map(rows.map((row) => [row.userId, toSettings(row)]));
  }

  async save(userId: string, settings: TaskNoticeSettings, skipDigestOn: string | null): Promise<void> {
    const digestLastSentOn = skipDigestOn ? { digestLastSentOn: skipDigestOn } : {};
    await this.ds.getRepository(TaskNoticePreference).upsert({ userId, ...settings, ...digestLastSentOn }, ['userId']);
  }

  digestRecipients(hour: number, today: string): Promise<TaskSummaryRecipient[]> {
    return this.ds.query(DIGEST_RECIPIENTS, [hour, today, TASK_NOTICE_DEFAULTS.channel, TASK_NOTICE_DEFAULTS.digestHour]);
  }

  async claimDigest(userId: string, today: string, tx: TransactionContext): Promise<boolean> {
    const rows: unknown[] = await managerOf(tx, this.ds.manager).query(CLAIM_DIGEST, [userId, today]);
    return rows.length > 0;
  }
}
