import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import type { CareerContentStatus } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { CareerContentRepository } from '../../domain/contracts/career-content.repository';
import { CareerTitleContent, CareerTitleContentVersion } from '../../domain/entities/career-profile.entities';
import type { CodedContent } from '../../domain/rules/learning-links.rules';
import type { ContentWrite, StoredCareerContent } from '../../domain/types/career-profile.types';

@Injectable()
export class TypeOrmCareerContentRepository extends CareerContentRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {
    super();
  }

  private m(tx?: TransactionContext): EntityManager {
    return managerOf(tx, this.ds.manager);
  }

  async find(titleId: string, tx?: TransactionContext): Promise<StoredCareerContent | null> {
    return toStored(await this.m(tx).findOne(CareerTitleContent, { where: { titleId } }));
  }

  async lock(titleId: string, tx: TransactionContext): Promise<StoredCareerContent | null> {
    // A row lock cannot cover a title that has no row yet, so the title's own advisory lock serialises every save, publish and draft of it.
    const m = this.m(tx);
    await m.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`career-content:${titleId}`]);
    return toStored(await m.findOne(CareerTitleContent, { where: { titleId } }));
  }

  async save({ titleId, content, status, version, actorId }: ContentWrite, tx: TransactionContext): Promise<StoredCareerContent> {
    const m = this.m(tx);
    await m.upsert(CareerTitleContent, { titleId, version, status, content, updatedBy: actorId }, ['titleId']);
    await m.insert(CareerTitleContentVersion, { titleId, version, content, savedBy: actorId });
    return toStored(await m.findOneOrFail(CareerTitleContent, { where: { titleId } }))!;
  }

  async findByCodes(codes: readonly string[]): Promise<Map<string, CodedContent>> {
    if (codes.length === 0) return new Map();
    const rows: { id: string; code: string; version: number | null; content: CodedContent['content'] }[] = await this.ds.query(
      `SELECT j.id, j.code, c.version, c.content FROM job_titles j LEFT JOIN career_title_content c ON c.title_id = j.id WHERE j.deleted_at IS NULL AND j.code = ANY($1)`,
      [codes],
    );
    return new Map(rows.map((r) => [r.code.toUpperCase(), { titleId: r.id, version: r.version ?? 0, content: r.content }]));
  }

  async setStatus(titleId: string, status: CareerContentStatus, actorId: string, tx: TransactionContext): Promise<void> {
    await this.m(tx).update(CareerTitleContent, { titleId }, { status, updatedBy: actorId });
  }
}

function toStored(row: CareerTitleContent | null): StoredCareerContent | null {
  return row && { titleId: row.titleId, version: row.version, status: row.status, content: row.content, updatedAt: row.updatedAt };
}
