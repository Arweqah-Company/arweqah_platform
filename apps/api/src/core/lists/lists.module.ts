import { Global, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../access/application/permission-catalog';
import { ListSettingsService } from './application/list-settings.service';
import { ListSetting } from './domain/list-setting.entity';
import { ListSettingsRepository } from './domain/list-settings.repository';
import { LISTS_PERMISSIONS } from './domain/lists.permissions';
import { TypeOrmListSettingsRepository } from './infrastructure/typeorm-list-settings.repository';
import { ListSettingsController } from './presentation/list-settings.controller';

/** Which columns and filters the lists of the platform show (one setting for everyone). Global: the profile (GET /me) carries it. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ListSetting])],
  controllers: [ListSettingsController],
  providers: [ListSettingsService, { provide: ListSettingsRepository, useClass: TypeOrmListSettingsRepository }],
  exports: [ListSettingsService],
})
export class ListsModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(LISTS_PERMISSIONS);
  }
}
