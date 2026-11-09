import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { WorkflowRegistry } from '../../core/workflow/application/workflow-definition';
import { OrgModule } from '../org/org.module';
import { CareerProgressService } from './application/services/career-progress.service';
import { CareerProofService } from './application/services/career-proof.service';
import { CareerReviewService } from './application/services/career-review.service';
import { CareerContentService } from './application/services/career-content.service';
import { LearningLinksService } from './application/services/learning-links.service';
import { CareerTitleListService } from './application/services/career-title-list.service';
import { CareerProfileService } from './application/services/career-profile.service';
import { CareerReopenService } from './application/services/career-reopen.service';
import { TitleFileService } from './application/services/title-file.service';
import { CareerLearningRepository } from './domain/contracts/career-learning.repository';
import { CareerAcknowledgementRepository } from './domain/contracts/career-acknowledgement.repository';
import { CareerTitleListRepository } from './domain/contracts/career-title-list.repository';
import { CareerContentRepository } from './domain/contracts/career-content.repository';
import { TitleIdentityPort } from './domain/contracts/title-identity.port';
import { CAREER_ACKNOWLEDGEMENT_ENTITIES } from './domain/entities/career-acknowledgement.entities';
import { CAREER_PROGRESS_ENTITIES } from './domain/entities/career-progress.entities';
import { CERTIFICATE_KEY, CERTIFICATE_VERSION, certificateMachine } from './domain/rules/certificate.machine';
import { CAREER_CONTENT_ENTITIES } from './domain/entities/career-profile.entities';
import { CAREER_PROFILE_PERMISSIONS } from './domain/permissions/career-profile.permissions';
import { OrgTitleIdentityAdapter } from './infrastructure/adapters/org-title-identity.adapter';
import { TypeOrmCareerLearningRepository } from './infrastructure/repositories/typeorm-career-learning.repository';
import { TypeOrmCareerAcknowledgementRepository } from './infrastructure/repositories/typeorm-career-acknowledgement.repository';
import { TypeOrmCareerTitleListRepository } from './infrastructure/repositories/typeorm-career-title-list.repository';
import { TypeOrmCareerContentRepository } from './infrastructure/repositories/typeorm-career-content.repository';
import { CareerCertificatesController } from './presentation/controllers/career-certificates.controller';
import { CareerTitlesController } from './presentation/controllers/career-titles.controller';
import { MyCareerController } from './presentation/controllers/my-career.controller';
import { CareerContentController } from './presentation/controllers/career-content.controller';

/** The career path of each job title (content now; the employee's page, the acknowledgement, the learning records and the requests come in later stages). */
@Module({
  imports: [TypeOrmModule.forFeature([...CAREER_CONTENT_ENTITIES, ...CAREER_ACKNOWLEDGEMENT_ENTITIES, ...CAREER_PROGRESS_ENTITIES]), OrgModule],
  controllers: [CareerContentController, CareerTitlesController, CareerCertificatesController, MyCareerController],
  providers: [
    CareerContentService,
    TitleFileService,
    CareerProfileService,
    CareerReopenService,
    CareerProofService,
    CareerProgressService,
    CareerReviewService,
    CareerTitleListService,
    LearningLinksService,
    { provide: CareerContentRepository, useClass: TypeOrmCareerContentRepository },
    { provide: CareerTitleListRepository, useClass: TypeOrmCareerTitleListRepository },
    { provide: CareerLearningRepository, useClass: TypeOrmCareerLearningRepository },
    { provide: CareerAcknowledgementRepository, useClass: TypeOrmCareerAcknowledgementRepository },
    { provide: TitleIdentityPort, useClass: OrgTitleIdentityAdapter },
  ],
})
export class CareerProfileModule implements OnModuleInit {
  constructor(
    private readonly catalog: PermissionCatalog,
    private readonly workflows: WorkflowRegistry,
  ) {}

  onModuleInit(): void {
    this.catalog.register(CAREER_PROFILE_PERMISSIONS);
    this.workflows.register({ key: CERTIFICATE_KEY, version: CERTIFICATE_VERSION, machine: certificateMachine });
  }
}
