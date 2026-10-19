import { Inject, Injectable } from '@nestjs/common';
import { ConflictError } from '../../../common/domain/domain-error';
import { IdentityProvider } from '../application/identity-provider';
import type { BetterAuthInstance } from './better-auth.factory';
import { BETTER_AUTH } from './tokens';

/** Adapter: user/account operations through Better Auth's internal adapter. */
@Injectable()
export class BetterAuthIdentityProvider extends IdentityProvider {
  constructor(@Inject(BETTER_AUTH) private readonly auth: BetterAuthInstance) {
    super();
  }

  async createUser(input: { name: string; email: string; locale: 'ar' | 'en'; password?: string }): Promise<string> {
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
    if (input.password) {
      await ctx.internalAdapter.linkAccount({
        userId: user.id,
        providerId: 'credential',
        accountId: user.id,
        password: await ctx.password.hash(input.password),
      });
    }
    return user.id;
  }

  async setPassword(userId: string, password: string): Promise<void> {
    const ctx = await this.auth.$context;
    await ctx.internalAdapter.updatePassword(userId, await ctx.password.hash(password));
  }

  async revokeAllSessions(userId: string): Promise<void> {
    const ctx = await this.auth.$context;
    await ctx.internalAdapter.deleteUserSessions(userId);
  }
}
