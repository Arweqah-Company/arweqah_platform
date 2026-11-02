import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { ConflictError } from '../../../common/domain/domain-error';
import { IdentityProvider } from '../application/identity-provider';
import type { BetterAuthInstance } from './better-auth.factory';
import { AUTH_DB_POOL, BETTER_AUTH } from './tokens';

/** Adapter: user/account operations through Better Auth's internal adapter. */
@Injectable()
export class BetterAuthIdentityProvider extends IdentityProvider {
  constructor(
    @Inject(BETTER_AUTH) private readonly auth: BetterAuthInstance,
    @Inject(AUTH_DB_POOL) private readonly pool: Pool,
  ) {
    super();
  }

  async createUser(input: { name: string; email: string; locale: 'ar' | 'en' }): Promise<string> {
    const ctx = await this.auth.$context;
    if (await ctx.internalAdapter.findUserByEmail(input.email, { includeAccounts: false })) {
      throw new ConflictError('A user with this email already exists');
    }
    const user = await ctx.internalAdapter.createUser({
      name: input.name,
      email: input.email,
      emailVerified: true,
      locale: input.locale,
    }, { method: 'admin' });
    return user.id;
  }

  async revokeAllSessions(userId: string): Promise<void> {
    const ctx = await this.auth.$context;
    await ctx.internalAdapter.deleteUserSessions(userId);
  }

  async setActive(userId: string, active: boolean): Promise<void> {
    await this.pool.query('UPDATE users SET is_active = $2, updated_at = now() WHERE id = $1', [userId, active]);
    if (!active) {
      await this.revokeAllSessions(userId);
      await this.pool.query('DELETE FROM trusted_devices WHERE user_id = $1', [userId]);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const ctx = await this.auth.$context;
    await ctx.internalAdapter.deleteUser(userId);
  }
}
