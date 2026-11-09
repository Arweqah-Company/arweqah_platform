import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { ReminderDto, ReminderInput, ReminderKind } from '@arweqah-platform/shared';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { PerformanceReminderRepository } from '../../domain/contracts/performance-reminder.repository';
import { PerformanceReminder } from '../../domain/entities/performance-reminders.entities';

const toDto = (r: PerformanceReminder): ReminderDto => ({ id: r.id, kind: r.kind as ReminderKind, on: r.isOn, days: r.days, titleAr: r.titleAr, titleEn: r.titleEn, bodyAr: r.bodyAr, bodyEn: r.bodyEn });
const columns = (i: ReminderInput, actorId: string) => ({ kind: i.kind, isOn: i.on, days: i.days, titleAr: i.titleAr, titleEn: i.titleEn, bodyAr: i.bodyAr, bodyEn: i.bodyEn, updatedBy: actorId });

@Injectable()
export class TypeOrmPerformanceReminderRepository extends PerformanceReminderRepository {
  constructor(
    @InjectRepository(PerformanceReminder) private readonly reminders: Repository<PerformanceReminder>,
    private readonly ds: DataSource,
  ) {
    super();
  }

  private repo(tx: TransactionContext): Repository<PerformanceReminder> {
    return managerOf(tx, this.ds.manager).getRepository(PerformanceReminder);
  }

  async list(): Promise<ReminderDto[]> {
    return (await this.reminders.find({ order: { createdAt: 'ASC', id: 'ASC' } })).map(toDto);
  }

  count(): Promise<number> {
    return this.reminders.count();
  }

  async insert(input: ReminderInput, actorId: string, tx: TransactionContext): Promise<ReminderDto> {
    return toDto(await this.repo(tx).save(Object.assign(new PerformanceReminder(), columns(input, actorId))));
  }

  async update(id: string, input: ReminderInput, actorId: string, tx: TransactionContext): Promise<ReminderDto | null> {
    const found = await this.repo(tx).findOne({ where: { id } });
    if (!found) return null;
    return toDto(await this.repo(tx).save(Object.assign(found, columns(input, actorId))));
  }

  async remove(id: string, tx: TransactionContext): Promise<boolean> {
    const result = await this.repo(tx).delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
