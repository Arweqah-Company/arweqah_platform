import { Injectable } from '@nestjs/common';
import { CorePermission } from '@arweqah-platform/shared';
import type { AccessContext } from '../domain/access-context';

export type AdminCapability = (ctx: AccessContext) => Promise<boolean> | boolean;

/**
 * Who may switch platform admin mode on. The permission `admin_mode.use` always counts; feature modules add
 * their own capabilities (for example "manages a ticket desk") with `register` when they start.
 */
@Injectable()
export class AdminModeEligibility {
  private readonly capabilities: AdminCapability[] = [(ctx) => ctx.has(CorePermission.AdminModeUse)];

  register(capability: AdminCapability): void {
    this.capabilities.push(capability);
  }

  async isEligible(ctx: AccessContext): Promise<boolean> {
    for (const capability of this.capabilities) if (await capability(ctx)) return true;
    return false;
  }
}
