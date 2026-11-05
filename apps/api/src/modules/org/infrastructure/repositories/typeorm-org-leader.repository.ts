import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { OrgNodeLeader } from '../../domain/entities/org.entities';
import { OrgLeaderRepository } from '../../domain/contracts/org-leader.repository';
import type { LeaderRow, NewLeader } from '../../domain/types/org-leader.types';

const toRow = (l: OrgNodeLeader): LeaderRow => ({
  id: l.id,
  nodeId: l.nodeId,
  companyId: l.companyId,
  employeeId: l.employeeId,
  kind: l.kind,
  validFrom: l.validFrom,
  validTo: l.validTo,
  reason: l.reason,
  createdBy: l.createdBy,
});

@Injectable()
export class TypeOrmOrgLeaderRepository extends OrgLeaderRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  private m(tx?: TransactionContext): EntityManager {
    return managerOf(tx, this.ds.manager);
  }

  async lock(nodeId: string, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('SELECT pg_advisory_xact_lock(hashtext($1))', [`org-node-leaders:${nodeId}`]);
  }

  async rowsOf(nodeId: string, tx?: TransactionContext): Promise<LeaderRow[]> {
    const rows = await this.m(tx).getRepository(OrgNodeLeader).find({ where: { nodeId }, order: { validFrom: 'DESC', createdAt: 'DESC' } });
    return rows.map(toRow);
  }

  async byId(id: string): Promise<LeaderRow | null> {
    const row = await this.ds.getRepository(OrgNodeLeader).findOne({ where: { id } });
    return row ? toRow(row) : null;
  }

  async insert(row: NewLeader, tx: TransactionContext): Promise<string> {
    const repo = this.m(tx).getRepository(OrgNodeLeader);
    return (await repo.save(repo.create(row))).id;
  }

  async close(id: string, validTo: string | null, tx: TransactionContext): Promise<void> {
    await this.m(tx).getRepository(OrgNodeLeader).update({ id }, { validTo });
  }

  async remove(id: string, tx: TransactionContext): Promise<void> {
    await this.m(tx).getRepository(OrgNodeLeader).delete({ id });
  }

  async activeRows(day: string): Promise<LeaderRow[]> {
    const rows = await this.ds
      .getRepository(OrgNodeLeader)
      .createQueryBuilder('l')
      .innerJoin('org_nodes', 'n', 'n.id = l.node_id AND n.deleted_at IS NULL')
      .where('l.valid_from <= :day AND (l.valid_to IS NULL OR l.valid_to >= :day)', { day })
      .getMany();
    return rows.map(toRow);
  }

  async nodesWithRows(): Promise<string[]> {
    const rows: { node_id: string }[] = await this.ds.query('SELECT DISTINCT l.node_id FROM org_node_leaders l JOIN org_nodes n ON n.id = l.node_id AND n.deleted_at IS NULL');
    return rows.map((r) => r.node_id);
  }

  async employeesOf(nodeId: string): Promise<string[]> {
    const rows: { employee_id: string }[] = await this.ds.query('SELECT DISTINCT employee_id FROM org_node_leaders WHERE node_id = $1', [nodeId]);
    return rows.map((r) => r.employee_id);
  }

  async setNodeManager(nodeId: string, employeeId: string | null, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('UPDATE org_nodes SET manager_id = $2, updated_at = now() WHERE id = $1', [nodeId, employeeId]);
  }
}
