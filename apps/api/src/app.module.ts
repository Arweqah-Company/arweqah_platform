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
import { PermissionsGuard } from './core/access/presentation/permissions.guard';
import { AuditModule } from './core/audit/audit.module';
import { AuthCoreModule } from './core/auth/auth-core.module';
import type { BetterAuthInstance } from './core/auth/infrastructure/better-auth.factory';
import { BETTER_AUTH } from './core/auth/infrastructure/tokens';
import { FilesModule } from './core/files/files.module';
import { MessagingModule } from './core/messaging/messaging.module';
import { NotificationsModule } from './core/notifications/notifications.module';
import { WorkflowModule } from './core/workflow/workflow.module';
import { FoundationSeeder } from './database/seeds/foundation.seeder';
import { HealthModule } from './health/health.module';
import { OrgModule } from './modules/org/org.module';
import { UsersModule } from './modules/users/users.module';

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
    AuditModule,
    MessagingModule,
    WorkflowModule,
    NotificationsModule,
    FilesModule,
    // Feature modules
    OrgModule,
    UsersModule,
    HealthModule,
  ],
  providers: [
    // Order matters: authenticate first, then authorize.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useExisting: PermissionsGuard },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    FoundationSeeder,
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
