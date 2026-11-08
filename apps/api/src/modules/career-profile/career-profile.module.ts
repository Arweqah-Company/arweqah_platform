import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { OrgModule } from '../org/org.module';
import { CareerContentService } from './application/services/career-content.service';
import { CareerContentRepository } from './domain/contracts/career-content.repository';
import { TitleIdentityPort } from './domain/contracts/title-identity.port';
import { CAREER_PROFILE_ENTITIES } from './domain/entities/career-profile.entities';
import { CAREER_PROFILE_PERMISSIONS } from './domain/permissions/career-profile.permissions';
import { OrgTitleIdentityAdapter } from './infrastructure/adapters/org-title-identity.adapter';
import { TypeOrmCareerContentRepository } from './infrastructure/repositories/typeorm-career-content.repository';
import { CareerContentController } from './presentation/controllers/career-content.controller';

/** The career path of each job title (content now; the employee's page, the acknowledgement, the learning records and the requests come in later stages). */
@Module({
  imports: [TypeOrmModule.forFeature(CAREER_PROFILE_ENTITIES), OrgModule],
  controllers: [CareerContentController],
  providers: [
    CareerContentService,
    { provide: CareerContentRepository, useClass: TypeOrmCareerContentRepository },
    { provide: TitleIdentityPort, useClass: OrgTitleIdentityAdapter },
  ],
})
export class CareerProfileModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(CAREER_PROFILE_PERMISSIONS);
  }
}
