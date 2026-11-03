import { Inject, Injectable } from '@nestjs/common';
import { SessionSwitcher } from '../domain/session-switcher';
import type { BetterAuthInstance } from '../../auth/infrastructure/better-auth.factory';
import { BETTER_AUTH } from '../../auth/infrastructure/tokens';

/** Adapter: the two server-only endpoints of the impersonation plugin, called in-process; the answer is the cookies to send to the browser. */
@Injectable()
export class BetterAuthSessionSwitcher extends SessionSwitcher {
  constructor(@Inject(BETTER_AUTH) private readonly auth: BetterAuthInstance) {
    super();
  }

  async openFor(targetUserId: string, impersonatorUserId: string, impersonatorSessionId: string): Promise<string[]> {
    const { headers } = await this.auth.api.openImpersonation({ body: { userId: targetUserId, impersonatorUserId, impersonatorSessionId }, returnHeaders: true });
    return headers.getSetCookie();
  }

  async returnTo(adminToken: string): Promise<string[]> {
    const { headers } = await this.auth.api.returnFromImpersonation({ body: { token: adminToken }, returnHeaders: true });
    return headers.getSetCookie();
  }
}
