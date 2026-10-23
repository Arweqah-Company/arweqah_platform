import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListSetting } from '../domain/list-setting.entity';
import { ListSettingsRepository } from '../domain/list-settings.repository';

@Injectable()
export class TypeOrmListSettingsRepository extends ListSettingsRepository {
  constructor(@InjectRepository(ListSetting) private readonly rows: Repository<ListSetting>) {
    super();
  }

  findAll(): Promise<ListSetting[]> {
    return this.rows.find();
  }

  async replace(listKey: string, hiddenColumns: string[], hiddenFilters: string[]): Promise<void> {
    if (!hiddenColumns.length && !hiddenFilters.length) await this.rows.delete({ listKey });
    else await this.rows.save({ listKey, hiddenColumns, hiddenFilters });
  }
}
