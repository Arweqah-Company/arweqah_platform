import { Module, OnModuleInit } from '@nestjs/common';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { OrgModule } from '../org/org.module';
import { LookupsService } from './application/services/lookups.service';
import { LOOKUPS_PERMISSIONS } from './domain/permissions/lookups.permissions';
import { LookupsRepository } from './domain/contracts/lookups.repository';
import { TypeOrmLookupsRepository } from './infrastructure/repositories/typeorm-lookups.repository';
import { LookupsController } from './presentation/controllers/lookups.controller';

@Module({
  imports: [OrgModule],
  controllers: [LookupsController],
  exports: [LookupsService],
  providers: [LookupsService, { provide: LookupsRepository, useClass: TypeOrmLookupsRepository }],
})
export class LookupsModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(LOOKUPS_PERMISSIONS);
  }
}
