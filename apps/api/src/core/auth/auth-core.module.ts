import { Global, Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Pool } from 'pg';
import { AppConfig } from '../../config/app-config.service';
import { AccountPreferencesService } from './application/account-preferences.service';
import { AuthenticatorService } from './application/authenticator.service';
import { IdentityProvider } from './application/identity-provider';
import { InvitationService } from './application/invitation.service';
import { SecuritySettingsService } from './application/security-settings.service';
import { SessionsService } from './application/sessions.service';
import { TrustedDevicesService } from './application/trusted-devices.service';
import { DeviceSecurityRepository } from './domain/device-security.repository';
import { SecuritySettingsRepository } from './domain/security-settings.repository';
import { TypeOrmDeviceSecurityRepository } from './infrastructure/typeorm-device-security.repository';
import { TypeOrmSecuritySettingsRepository } from './infrastructure/typeorm-security-settings.repository';
import { SecuritySettingsController } from './presentation/security-settings.controller';
import { SessionsController } from './presentation/sessions.controller';
import { AccountPreferencesRepository } from './domain/account-preferences.repository';
import { AuthenticatorRepository } from './domain/authenticator.repository';
import { PgAuthLifecycle } from './infrastructure/auth-lifecycle';
import { createBetterAuth } from './infrastructure/better-auth.factory';
import { BetterAuthIdentityProvider } from './infrastructure/better-auth.identity-provider';
import { TypeOrmAccountPreferencesRepository } from './infrastructure/typeorm-account-preferences.repository';
import { TypeOrmAuthenticatorRepository } from './infrastructure/typeorm-authenticator.repository';
import { MfaController } from './presentation/mfa.controller';
import { AUTH_DB_POOL, BETTER_AUTH } from './infrastructure/tokens';

/** Builds the Better Auth instance once; AuthModule (the Nest integration) consumes it. */
@Global()
@Module({
  providers: [
    {
      provide: AUTH_DB_POOL,
      inject: [AppConfig],
      useFactory: (c: AppConfig) =>
        new Pool({
          host: c.get('DB_HOST'),
          port: c.get('DB_PORT'),
          database: c.get('DB_NAME'),
          user: c.get('DB_USER'),
          password: c.get('DB_PASSWORD'),
          ssl: c.get('DB_SSL') ? { rejectUnauthorized: true } : undefined,
          max: 10,
        }),
    },
    { provide: AuthenticatorRepository, useClass: TypeOrmAuthenticatorRepository },
    { provide: AccountPreferencesRepository, useClass: TypeOrmAccountPreferencesRepository },
    { provide: DeviceSecurityRepository, useClass: TypeOrmDeviceSecurityRepository },
    { provide: SecuritySettingsRepository, useClass: TypeOrmSecuritySettingsRepository },
    AccountPreferencesService,
    SecuritySettingsService,
    SessionsService,
    TrustedDevicesService,
    AuthenticatorService,
    InvitationService,
    {
      provide: BETTER_AUTH,
      inject: [AppConfig, AUTH_DB_POOL, EventEmitter2, AuthenticatorService],
      useFactory: (c: AppConfig, pool: Pool, events: EventEmitter2, authenticator: AuthenticatorService) =>
        createBetterAuth(c, pool, new PgAuthLifecycle(pool, events), { verifySignIn: (email, code) => authenticator.verifySignIn(email, code) }),
    },
    { provide: IdentityProvider, useClass: BetterAuthIdentityProvider },
  ],
  controllers: [MfaController, SessionsController, SecuritySettingsController],
  exports: [BETTER_AUTH, IdentityProvider, AuthenticatorService, InvitationService, AccountPreferencesService, SecuritySettingsService],
})
export class AuthCoreModule implements OnModuleDestroy {
  constructor(@Inject(AUTH_DB_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
