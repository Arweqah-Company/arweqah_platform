import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { saveNames } from '../../../../common/infrastructure/translations';
import { OrgNodeVersion } from '../../domain/entities/org.entities';
import { OrgVersionRepository, type NewVersion } from '../../domain/contracts/org-version.repository';
import type { UnitValues, VersionView } from '../../domain/types/org-version.types';

const toView = (v: OrgNodeVersion): VersionView => ({
  id: v.id,
  nodeId: v.nodeId,
  validFrom: v.validFrom,
  validTo: v.validTo,
  nameAr: v.nameAr,
  nameEn: v.nameEn,
  code: v.code,
  isActive: v.isActive,
  charter: v.charter,
  reason: v.reason,
  createdBy: v.createdBy,
  createdAt: v.createdAt,
  appliedAt: v.appliedAt,
});

@Injectable()
export class TypeOrmOrgVersionRepository extends OrgVersionRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  private m(tx?: TransactionContext): EntityManager {
    return managerOf(tx, this.ds.manager);
  }

  async lockNode(nodeId: string, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('SELECT pg_advisory_xact_lock(hashtext($1))', [`org-node-versions:${nodeId}`]);
  }

  async versionsOf(nodeId: string, tx?: TransactionContext): Promise<VersionView[]> {
    const rows = await this.m(tx).getRepository(OrgNodeVersion).find({ where: { nodeId }, order: { validFrom: 'ASC', createdAt: 'ASC' } });
    return rows.map(toView);
  }

  async insert(row: NewVersion, tx: TransactionContext): Promise<void> {
    const repo = this.m(tx).getRepository(OrgNodeVersion);
    await repo.save(repo.create(row));
  }

  async overwrite(id: string, values: UnitValues & { reason: string; createdBy: string | null; appliedAt: Date | null }, tx: TransactionContext): Promise<void> {
    await this.m(tx).getRepository(OrgNodeVersion).update({ id }, values);
  }

  async close(id: string, validTo: string | null, tx: TransactionContext): Promise<void> {
    await this.m(tx).getRepository(OrgNodeVersion).update({ id }, { validTo });
  }

  async due(today: string): Promise<VersionView[]> {
    const rows = await this.ds
      .getRepository(OrgNodeVersion)
      .createQueryBuilder('v')
      .innerJoin('org_nodes', 'n', 'n.id = v.node_id AND n.deleted_at IS NULL')
      .where('v.applied_at IS NULL AND v.valid_from <= :today', { today })
      .orderBy('v.valid_from', 'ASC')
      .addOrderBy('v.created_at', 'ASC')
      .getMany();
    return rows.map(toView);
  }

  async markApplied(id: string, at: Date, tx: TransactionContext): Promise<void> {
    await this.m(tx).getRepository(OrgNodeVersion).update({ id }, { appliedAt: at });
  }

  async applyToNode(nodeId: string, values: UnitValues, tx: TransactionContext): Promise<void> {
    const m = this.m(tx);
    await m.query('UPDATE org_nodes SET is_active = $2, charter = $3::jsonb, updated_at = now() WHERE id = $1', [nodeId, values.isActive, values.charter ? JSON.stringify(values.charter) : null]);
    await saveNames(m, { table: 'org_node_translations', foreignKey: 'org_node_id', parentId: nodeId }, values);
  }

  async scheduledNodeIds(today: string): Promise<Set<string>> {
    const rows: { node_id: string }[] = await this.ds.query('SELECT DISTINCT node_id FROM org_node_versions WHERE valid_from > $1', [today]);
    return new Set(rows.map((r) => r.node_id));
  }
}
