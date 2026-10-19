import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Pool } from 'pg';
import { AUDIT_EVENT, type AuditEvent } from '../../audit/application/audit.events';
import type { AuthLifecycle } from '../application/identity-provider';

/** Hooks Better Auth calls: refuse inactive users, audit sign-ins. */
@Injectable()
export class PgAuthLifecycle implements AuthLifecycle {
  constructor(
    private readonly pool: Pool,
    private readonly events: EventEmitter2,
  ) {}

  async isActive(userId: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ is_active: boolean }>('SELECT is_active FROM users WHERE id = $1', [userId]);
    return rows[0]?.is_active === true;
  }

  onSignIn(userId: string, ip: string | null): void {
    const event: AuditEvent = { actorId: userId, action: 'auth.sign_in', entityType: 'user', entityId: userId, ip };
    this.events.emit(AUDIT_EVENT, event);
  }
}
