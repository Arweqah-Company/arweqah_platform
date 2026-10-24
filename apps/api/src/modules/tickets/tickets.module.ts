import { Global, Module, OnModuleInit } from '@nestjs/common';
import { AdminModeEligibility } from '../../core/access/application/admin-mode-eligibility';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { OrgNodeDependentsPort } from '../org/domain/contracts/org-node-dependents.port';
import { OrgModule } from '../org/org.module';
import { TicketCatalogService } from './application/services/ticket-catalog.service';
import { TicketFiguresService } from './application/services/ticket-figures.service';
import { TicketLifecycleService } from './application/services/ticket-lifecycle.service';
import { TicketNotifier } from './application/services/ticket-notifier.service';
import { TicketSummaryService } from './application/services/ticket-summary.service';
import { TicketSetupService } from './application/services/ticket-setup.service';
import { TicketsService } from './application/services/tickets.service';
import { TicketAccessPolicy } from './application/policies/ticket-access.policy';
import { TicketTransformer } from './application/transformers/ticket.transformer';
import { TicketDeskRepository } from './domain/contracts/ticket-desk.repository';
import { TicketDirectory } from './domain/contracts/ticket-directory.port';
import { TicketFiguresRepository } from './domain/contracts/ticket-figures.repository';
import { TicketRepository } from './domain/contracts/ticket.repository';
import { TicketSummaryRepository } from './domain/contracts/ticket-summary.repository';
import { TICKET_PERMISSIONS } from './domain/permissions/tickets.permissions';
import { TicketOrgNodeDependentsAdapter } from './infrastructure/adapters/org-node-dependents.adapter';
import { TicketJobs } from './infrastructure/jobs/ticket-auto-close.job';
import { TypeOrmTicketDeskRepository } from './infrastructure/repositories/typeorm-ticket-desk.repository';
import { TypeOrmTicketDirectory } from './infrastructure/repositories/typeorm-ticket-directory';
import { TypeOrmTicketFiguresRepository } from './infrastructure/repositories/typeorm-ticket-figures.repository';
import { TypeOrmTicketSummaryRepository } from './infrastructure/repositories/typeorm-ticket-summary.repository';
import { TypeOrmTicketRepository } from './infrastructure/repositories/typeorm-ticket.repository';
import { TicketFiguresController } from './presentation/controllers/ticket-figures.controller';
import { TicketSetupController } from './presentation/controllers/ticket-setup.controller';
import { TicketSummaryController } from './presentation/controllers/ticket-summary.controller';
import { TicketsController } from './presentation/controllers/tickets.controller';

/**
 * Tickets: employees send requests to departments; the department's assignee and manager answer and close them.
 * Global so the org module can ask OrgNodeDependentsPort which units are in use without importing this module.
 */
@Global()
@Module({
  imports: [OrgModule],
  // The fixed paths (setup, figures, my summary) are registered before `tickets/:id`.
  controllers: [TicketSetupController, TicketFiguresController, TicketSummaryController, TicketsController],
  providers: [
    TicketsService,
    TicketLifecycleService,
    TicketSetupService,
    TicketCatalogService,
    TicketFiguresService,
    TicketSummaryService,
    TicketNotifier,
    TicketAccessPolicy,
    TicketTransformer,
    TicketJobs,
    { provide: TicketRepository, useClass: TypeOrmTicketRepository },
    { provide: TicketDeskRepository, useClass: TypeOrmTicketDeskRepository },
    { provide: TicketSummaryRepository, useClass: TypeOrmTicketSummaryRepository },
    { provide: TicketFiguresRepository, useClass: TypeOrmTicketFiguresRepository },
    { provide: TicketDirectory, useClass: TypeOrmTicketDirectory },
    { provide: OrgNodeDependentsPort, useClass: TicketOrgNodeDependentsAdapter },
  ],
  exports: [TicketLifecycleService, OrgNodeDependentsPort],
})
export class TicketsModule implements OnModuleInit {
  constructor(
    private readonly catalog: PermissionCatalog,
    private readonly eligibility: AdminModeEligibility,
    private readonly directory: TicketDirectory,
  ) {}

  onModuleInit(): void {
    this.catalog.register(TICKET_PERMISSIONS);
    // A manager of a department may use admin mode to set up its tickets.
    this.eligibility.register(async (ctx) => (await this.directory.managedDepartmentIds(ctx.userId)).length > 0);
  }
}
