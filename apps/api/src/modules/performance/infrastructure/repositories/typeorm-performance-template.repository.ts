import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { FiscalCard, GradeBand, StageTemplate } from '@arweqah-platform/shared';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { PerformanceTemplateRepository, SETTING_KEYS } from '../../domain/contracts/performance-template.repository';
import { PerformanceSetting, PerformanceTemplate } from '../../domain/entities/performance-templates.entities';

@Injectable()
export class TypeOrmPerformanceTemplateRepository extends PerformanceTemplateRepository {
  constructor(
    @InjectRepository(PerformanceTemplate) private readonly templates: Repository<PerformanceTemplate>,
    @InjectRepository(PerformanceSetting) private readonly settings: Repository<PerformanceSetting>,
    private readonly ds: DataSource,
  ) {
    super();
  }

  async stages(): Promise<StageTemplate[]> {
    return (await this.templates.find({ order: { stageNo: 'ASC' } })).map((r) => r.template);
  }

  async saveStage(template: StageTemplate, actorId: string, tx: TransactionContext): Promise<void> {
    const repo = managerOf(tx, this.ds.manager).getRepository(PerformanceTemplate);
    const before = await repo.findOne({ where: { stageNo: template.stage } });
    await repo.save(Object.assign(before ?? new PerformanceTemplate(), { stageNo: template.stage, name: template.name, template, sourceVersion: (before?.sourceVersion ?? 0) + 1, updatedBy: actorId }));
  }

  async scale(): Promise<GradeBand[] | null> {
    return ((await this.settings.findOne({ where: { key: SETTING_KEYS.scale } }))?.value as GradeBand[] | undefined) ?? null;
  }

  async fiscal(): Promise<FiscalCard | null> {
    return ((await this.settings.findOne({ where: { key: SETTING_KEYS.fiscal } }))?.value as FiscalCard | undefined) ?? null;
  }

  saveScale(bands: GradeBand[], actorId: string, tx: TransactionContext): Promise<void> {
    return this.saveSetting(SETTING_KEYS.scale, bands, actorId, tx);
  }

  saveFiscal(card: FiscalCard, actorId: string, tx: TransactionContext): Promise<void> {
    return this.saveSetting(SETTING_KEYS.fiscal, card, actorId, tx);
  }

  private async saveSetting(key: string, value: unknown, actorId: string, tx: TransactionContext): Promise<void> {
    await managerOf(tx, this.ds.manager).getRepository(PerformanceSetting).upsert({ key, value: value as object, updatedBy: actorId }, { conflictPaths: ['key'] });
  }
}
