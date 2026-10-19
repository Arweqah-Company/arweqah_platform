import { Global, Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Pool } from 'pg';
import { AppConfig } from '../../config/app-config.service';
import { IdentityProvider } from './application/identity-provider';
import { PgAuthLifecycle } from './infrastructure/auth-lifecycle';
import { createBetterAuth } from './infrastructure/better-auth.factory';
import { BetterAuthIdentityProvider } from './infrastructure/better-auth.identity-provider';
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
    {
      provide: BETTER_AUTH,
      inject: [AppConfig, AUTH_DB_POOL, EventEmitter2],
      useFactory: (c: AppConfig, pool: Pool, events: EventEmitter2) =>
        createBetterAuth(c, pool, new PgAuthLifecycle(pool, events)),
    },
    { provide: IdentityProvider, useClass: BetterAuthIdentityProvider },
  ],
  exports: [BETTER_AUTH, IdentityProvider],
})
export class AuthCoreModule implements OnModuleDestroy {
  constructor(@Inject(AUTH_DB_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
