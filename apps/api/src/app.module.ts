import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuard, AuthModule } from '@thallesp/nestjs-better-auth';
import { CommonModule } from './common/common.module';
import { DomainExceptionFilter } from './common/presentation/domain-exception.filter';
import { AppConfig } from './config/app-config.service';
import { AppConfigModule } from './config/config.module';
import { typeOrmOptions } from './config/typeorm.config';
import { AccessModule } from './core/access/access.module';
import { IntegrationsModule } from './core/integrations/integrations.module';
import { ListsModule } from './core/lists/lists.module';
import { PermissionsGuard } from './core/access/presentation/permissions.guard';
import { AuditModule } from './core/audit/audit.module';
import { AuthCoreModule } from './core/auth/auth-core.module';
import type { BetterAuthInstance } from './core/auth/infrastructure/better-auth.factory';
import { BETTER_AUTH } from './core/auth/infrastructure/tokens';
import { FilesModule } from './core/files/files.module';
import { TranslationModule } from './core/translation/translation.module';
import { MessagingModule } from './core/messaging/messaging.module';
import { NotificationsModule } from './core/notifications/notifications.module';
import { WorkflowModule } from './core/workflow/workflow.module';
import { OrgStructureSeeder } from './database/seeds/org-structure.seeder';
import { RolesCatalogSeeder } from './database/seeds/roles-catalog.seeder';
import { TicketsDemoSeeder } from './database/seeds/tickets-demo.seeder';
import { CompaniesSeeder } from './database/seeds/companies.seeder';
import { FoundationSeeder } from './database/seeds/foundation.seeder';
import { LookupsSeeder } from './database/seeds/lookups.seeder';
import { HealthModule } from './health/health.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { LookupsModule } from './modules/lookups/lookups.module';
import { OrgModule } from './modules/org/org.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TicketsModule } from './modules/tickets/tickets.module';

const JSON_LIMIT = '1mb';

@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (c: AppConfig) => dbFrom(c),
    }),
    AuthCoreModule,
    AuthModule.forRootAsync({
      inject: [BETTER_AUTH],
      useFactory: (auth: BetterAuthInstance) => ({
        auth,
        disableGlobalAuthGuard: true,
        bodyParser: { json: { limit: JSON_LIMIT }, urlencoded: { limit: JSON_LIMIT, extended: false } },
      }),
    }),
    // Core (shared infrastructure for every feature)
    AccessModule,
    ListsModule,
    IntegrationsModule,
    AuditModule,
    MessagingModule,
    WorkflowModule,
    NotificationsModule,
    FilesModule,
    TranslationModule,
    // Feature modules
    OrgModule,
    LookupsModule,
    EmployeesModule,
    TicketsModule,
    TasksModule,
    HealthModule,
  ],
  providers: [
    // Order matters: authenticate first, then authorize.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useExisting: PermissionsGuard },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    FoundationSeeder,
    LookupsSeeder,
    CompaniesSeeder,
    OrgStructureSeeder,
    TicketsDemoSeeder,
    RolesCatalogSeeder,
  ],
})
export class AppModule {}

function dbFrom(c: AppConfig) {
  return typeOrmOptions({
    DB_HOST: c.get('DB_HOST'),
    DB_PORT: c.get('DB_PORT'),
    DB_NAME: c.get('DB_NAME'),
    DB_USER: c.get('DB_USER'),
    DB_PASSWORD: c.get('DB_PASSWORD'),
    DB_SSL: c.get('DB_SSL'),
  });
}
