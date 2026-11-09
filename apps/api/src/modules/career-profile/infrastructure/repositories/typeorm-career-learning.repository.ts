import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { CertificatesQuery, ProofKind, RecordStatus } from '@arweqah-platform/shared';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { likeContains } from '../../../../common/infrastructure/sql-like';
import { CareerLearningRepository } from '../../domain/contracts/career-learning.repository';
import { CareerLearningRecord, CareerRequiredProgress } from '../../domain/entities/career-progress.entities';
import type { LearningRecordRow, QueueRow, RecordDecision, RecordWrite, RequiredTick } from '../../domain/types/career-profile.types';

interface QueueSqlRow {
  id: string; employee_id: string; title_id: string; unit_id: string; status: RecordStatus; proof_kind: ProofKind; file_id: string | null; file_name: string | null;
  note: string | null; minutes: number; submitted_at: Date; decided_by: string | null; decided_at: Date | null; rejection_reason: string | null; rejection_count: number;
  employee_name: string; unit_ar: string | null; unit_en: string | null; total: string;
}

/**
 * The records waiting for a decision (or of the state asked for) with the employee and the unit of the title they sent the proof for, in one
 * parameterized query (a read model over the structure's tables: raw SQL, covered by the API e2e on the real database).
 */
const QUEUE_SQL = `
SELECT r.id, r.employee_id, r.title_id, r.unit_id, r.status, r.proof_kind, r.file_id, f.original_name AS file_name, r.note, r.minutes, r.submitted_at,
  r.decided_by, r.decided_at, r.rejection_reason, r.rejection_count, e.full_name AS employee_name, ua.name AS unit_ar, COALESCE(ue.name, ua.name) AS unit_en,
  count(*) OVER () AS total
FROM career_learning_records r
JOIN employees e ON e.id = r.employee_id AND e.deleted_at IS NULL
JOIN job_titles j ON j.id = r.title_id
JOIN org_nodes n ON n.id = j.org_node_id
LEFT JOIN org_node_translations ua ON ua.org_node_id = n.id AND ua.lang = 'ar'
LEFT JOIN org_node_translations ue ON ue.org_node_id = n.id AND ue.lang = 'en'
LEFT JOIN files f ON f.id = r.file_id
WHERE (($1::text IS NULL AND r.status IN ('wait', 'referred')) OR r.status = $1)
  AND ($2::text IS NULL OR r.proof_kind = $2)
  AND ($3::text IS NULL OR e.full_name ILIKE $3 OR ua.name ILIKE $3 OR ue.name ILIKE $3)
ORDER BY r.submitted_at ASC, r.id ASC
LIMIT $4 OFFSET $5`;

@Injectable()
export class TypeOrmCareerLearningRepository extends CareerLearningRepository {
  constructor(
    @InjectRepository(CareerLearningRecord) private readonly records: Repository<CareerLearningRecord>,
    private readonly ds: DataSource,
  ) {
    super();
  }

  private repo(tx?: TransactionContext): Repository<CareerLearningRecord> {
    return tx ? managerOf(tx, this.ds.manager).getRepository(CareerLearningRecord) : this.records;
  }

  async forEmployee(employeeId: string): Promise<LearningRecordRow[]> {
    const rows = await this.records.find({ where: { employeeId }, order: { submittedAt: 'ASC' } });
    return Promise.all(rows.map((r) => this.toRow(r)));
  }

  async find(employeeId: string, unitId: string, tx?: TransactionContext): Promise<LearningRecordRow | null> {
    const row = await this.repo(tx).findOne({ where: { employeeId, unitId } });
    return row ? this.toRow(row, tx) : null;
  }

  async findById(id: string, tx?: TransactionContext): Promise<LearningRecordRow | null> {
    const row = await this.repo(tx).findOne({ where: { id } });
    return row ? this.toRow(row, tx) : null;
  }

  async submit(write: RecordWrite, tx: TransactionContext): Promise<LearningRecordRow> {
    const repo = this.repo(tx);
    const before = await repo.findOne({ where: { employeeId: write.employeeId, unitId: write.unitId } });
    const saved = await repo.save(Object.assign(before ?? new CareerLearningRecord(), write, { status: write.status, decidedBy: null, decidedAt: null, rejectionReason: null }));
    return this.toRow(saved, tx);
  }

  async decide(id: string, decision: RecordDecision, tx: TransactionContext): Promise<boolean> {
    const repo = this.repo(tx);
    const result = await repo
      .createQueryBuilder()
      .update(CareerLearningRecord)
      .set({ status: decision.status, decidedBy: decision.decidedBy, decidedAt: decision.decidedAt, rejectionReason: decision.rejectionReason, rejectionCount: () => `rejection_count + ${decision.rejectionIncrement}` })
      .where('id = :id AND status IN (:...open)', { id, open: ['wait', 'referred'] })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async queue(query: CertificatesQuery): Promise<{ items: QueueRow[]; total: number }> {
    const rows: QueueSqlRow[] = await this.ds.query(QUEUE_SQL, [query.status ?? null, query.kind ?? null, query.search ? likeContains(query.search) : null, query.pageSize, (query.page - 1) * query.pageSize]);
    return { items: rows.map(toQueueRow), total: Number(rows[0]?.total ?? 0) };
  }

  async requiredDone(employeeId: string, titleId: string): Promise<number[]> {
    const rows = await this.ds.getRepository(CareerRequiredProgress).find({ where: { employeeId, titleId } });
    return rows.map((r) => r.itemIndex);
  }

  async setRequired({ employeeId, titleId, index, done, at }: RequiredTick, tx: TransactionContext): Promise<void> {
    const repo = managerOf(tx, this.ds.manager).getRepository(CareerRequiredProgress);
    if (!done) {
      await repo.delete({ employeeId, titleId, itemIndex: index });
      return;
    }
    await repo.upsert({ employeeId, titleId, itemIndex: index, doneAt: at }, ['employeeId', 'titleId', 'itemIndex']);
  }

  private async toRow(r: CareerLearningRecord, tx?: TransactionContext): Promise<LearningRecordRow> {
    const fileName = r.fileId ? ((await managerOf(tx, this.ds.manager).query('SELECT original_name FROM files WHERE id = $1', [r.fileId])) as { original_name: string }[])[0]?.original_name ?? null : null;
    return {
      id: r.id, employeeId: r.employeeId, titleId: r.titleId, unitId: r.unitId, status: r.status as RecordStatus, proofKind: r.proofKind as ProofKind, fileId: r.fileId, fileName, note: r.note,
      minutes: r.minutes, submittedAt: r.submittedAt, decidedBy: r.decidedBy, decidedAt: r.decidedAt, rejectionReason: r.rejectionReason, rejectionCount: r.rejectionCount,
    };
  }
}

function toQueueRow(r: QueueSqlRow): QueueRow {
  return {
    id: r.id, employeeId: r.employee_id, titleId: r.title_id, unitId: r.unit_id, status: r.status, proofKind: r.proof_kind, fileId: r.file_id, fileName: r.file_name, note: r.note, minutes: r.minutes,
    submittedAt: r.submitted_at, decidedBy: r.decided_by, decidedAt: r.decided_at, rejectionReason: r.rejection_reason, rejectionCount: r.rejection_count,
    employeeName: r.employee_name, unitNameAr: r.unit_ar, unitNameEn: r.unit_en,
  };
}
