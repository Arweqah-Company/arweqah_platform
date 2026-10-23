import { Module, OnModuleInit } from '@nestjs/common';
import { AdminModeEligibility } from '../../core/access/application/admin-mode-eligibility';
import { PermissionCatalog } from '../../core/access/application/permission-catalog';
import { OrgModule } from '../org/org.module';
import { TicketCatalogService } from './application/services/ticket-catalog.service';
import { TicketFiguresService } from './application/services/ticket-figures.service';
import { TicketLifecycleService } from './application/services/ticket-lifecycle.service';
import { TicketNotifier } from './application/services/ticket-notifier.service';
import { TicketSetupService } from './application/services/ticket-setup.service';
import { TicketsService } from './application/services/tickets.service';
import { TicketAccessPolicy } from './application/policies/ticket-access.policy';
import { TicketTransformer } from './application/transformers/ticket.transformer';
import { TicketDeskRepository } from './domain/contracts/ticket-desk.repository';
import { TicketDirectory } from './domain/contracts/ticket-directory.port';
import { TicketFiguresRepository } from './domain/contracts/ticket-figures.repository';
import { TicketRepository } from './domain/contracts/ticket.repository';
import { TICKET_PERMISSIONS } from './domain/permissions/tickets.permissions';
import { TicketJobs } from './infrastructure/jobs/ticket-auto-close.job';
import { TypeOrmTicketDeskRepository } from './infrastructure/repositories/typeorm-ticket-desk.repository';
import { TypeOrmTicketDirectory } from './infrastructure/repositories/typeorm-ticket-directory';
import { TypeOrmTicketFiguresRepository } from './infrastructure/repositories/typeorm-ticket-figures.repository';
import { TypeOrmTicketRepository } from './infrastructure/repositories/typeorm-ticket.repository';
import { TicketFiguresController } from './presentation/controllers/ticket-figures.controller';
import { TicketSetupController } from './presentation/controllers/ticket-setup.controller';
import { TicketsController } from './presentation/controllers/tickets.controller';

/** Tickets: employees send requests to departments; the department's assignee and manager answer and close them. */
@Module({
  imports: [OrgModule],
  // The fixed paths (setup, figures) are registered before `tickets/:id`.
  controllers: [TicketSetupController, TicketFiguresController, TicketsController],
  providers: [
    TicketsService,
    TicketLifecycleService,
    TicketSetupService,
    TicketCatalogService,
    TicketFiguresService,
    TicketNotifier,
    TicketAccessPolicy,
    TicketTransformer,
    TicketJobs,
    { provide: TicketRepository, useClass: TypeOrmTicketRepository },
    { provide: TicketDeskRepository, useClass: TypeOrmTicketDeskRepository },
    { provide: TicketFiguresRepository, useClass: TypeOrmTicketFiguresRepository },
    { provide: TicketDirectory, useClass: TypeOrmTicketDirectory },
  ],
  exports: [TicketLifecycleService],
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
