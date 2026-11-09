import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { CatalogItemDto, CatalogItemInput, CatalogKind, CycleDate, CycleStage, TemplateSnapshot } from '@arweqah-platform/shared';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { PerformanceCycleRepository, type CycleRow } from '../../domain/contracts/performance-cycle.repository';
import { PerformanceCatalogItem, PerformanceCycle } from '../../domain/entities/performance-cycles.entities';

const toRow = (c: PerformanceCycle): CycleRow => ({ id: c.id, fiscalYear: c.fiscalYear, stage: c.status as CycleStage, openedAt: c.openedAt, closedAt: c.closedAt, dates: c.dates, snapshot: c.templateSnapshot });
const toItem = (i: PerformanceCatalogItem): CatalogItemDto => ({ id: i.id, kind: i.kind as CatalogKind, title: i.title, points: i.points });

@Injectable()
export class TypeOrmPerformanceCycleRepository extends PerformanceCycleRepository {
  constructor(
    @InjectRepository(PerformanceCycle) private readonly cycles: Repository<PerformanceCycle>,
    @InjectRepository(PerformanceCatalogItem) private readonly items: Repository<PerformanceCatalogItem>,
    private readonly ds: DataSource,
  ) {
    super();
  }

  private cycleRepo(tx: TransactionContext): Repository<PerformanceCycle> {
    return managerOf(tx, this.ds.manager).getRepository(PerformanceCycle);
  }

  private itemRepo(tx: TransactionContext): Repository<PerformanceCatalogItem> {
    return managerOf(tx, this.ds.manager).getRepository(PerformanceCatalogItem);
  }

  async current(): Promise<CycleRow | null> {
    const open = await this.cycles.createQueryBuilder('c').where('c.status <> :closed', { closed: 'closed' }).getOne();
    if (open) return toRow(open);
    const last = await this.cycles.findOne({ where: {}, order: { openedAt: 'DESC' } });
    return last ? toRow(last) : null;
  }

  yearExists(fiscalYear: number): Promise<boolean> {
    return this.cycles.exists({ where: { fiscalYear } });
  }

  async insert(cycle: { fiscalYear: number; openedBy: string; openedAt: Date; snapshot: TemplateSnapshot }, tx: TransactionContext): Promise<CycleRow> {
    const saved = await this.cycleRepo(tx).save(Object.assign(new PerformanceCycle(), { fiscalYear: cycle.fiscalYear, status: 'self', isOpen: true, openedBy: cycle.openedBy, openedAt: cycle.openedAt, dates: [], templateSnapshot: cycle.snapshot }));
    return toRow(saved);
  }

  async setStage(id: string, move: { from: CycleStage; to: CycleStage }, by: { userId: string; at: Date } | null, tx: TransactionContext): Promise<boolean> {
    const closing = move.to === 'closed';
    const result = await this.cycleRepo(tx).update({ id, status: move.from }, { status: move.to, ...(closing ? { isOpen: false } : {}), ...(closing && by ? { closedBy: by.userId, closedAt: by.at } : {}) });
    return (result.affected ?? 0) > 0;
  }

  async setDates(id: string, dates: CycleDate[], tx: TransactionContext): Promise<void> {
    await this.cycleRepo(tx).update({ id }, { dates });
  }

  async catalog(cycleId: string | null): Promise<CatalogItemDto[]> {
    const rows = await this.items.find({ where: { cycleId: cycleId ?? IsNull() }, order: { kind: 'ASC', createdAt: 'ASC' } });
    return rows.map(toItem);
  }

  async addItem(cycleId: string | null, item: CatalogItemInput, tx: TransactionContext): Promise<CatalogItemDto> {
    return toItem(await this.itemRepo(tx).save(Object.assign(new PerformanceCatalogItem(), { cycleId, kind: item.kind, title: item.title, points: item.points })));
  }

  async removeItem(id: string, cycleId: string | null, tx: TransactionContext): Promise<boolean> {
    const result = await this.itemRepo(tx).delete({ id, cycleId: cycleId ?? IsNull() });
    return (result.affected ?? 0) > 0;
  }

  async adoptWaiting(cycleId: string, tx: TransactionContext): Promise<void> {
    await this.itemRepo(tx).update({ cycleId: IsNull() }, { cycleId });
  }
}
