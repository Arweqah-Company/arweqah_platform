import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { TourSettingsService } from './application/services/tour-settings.service';
import { TourService } from './application/services/tour.service';
import { TourRepository } from './domain/contracts/tour.repository';
import { TOUR_ENTITIES } from './domain/entities/tour.entities';
import { TOUR_PERMISSIONS } from './domain/permissions/tour.permissions';
import { TypeOrmTourRepository } from './infrastructure/repositories/typeorm-tour.repository';
import { MyTourController } from './presentation/controllers/my-tour.controller';
import { TourSettingsController } from './presentation/controllers/tour-settings.controller';

/** The welcome tour: every employee's progress, and the administrator's edits of the steps the code declares. */
@Module({
  imports: [TypeOrmModule.forFeature(TOUR_ENTITIES)],
  controllers: [MyTourController, TourSettingsController],
  providers: [TourService, TourSettingsService, { provide: TourRepository, useClass: TypeOrmTourRepository }],
})
export class TourModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(TOUR_PERMISSIONS);
  }
}
