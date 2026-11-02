import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { UserAccessRepository } from '../domain/access.repository';
import { ACCESS_CHANGED, EMPLOYEES_CHANGED, ORG_CHANGED } from './access.events';

/**
 * Keeps the members of the automatic roles right: "everyone" (the employee role), "has_reports" (the direct manager role),
 * the role of each job title and the head role of each organization level.
 * Runs after every change to employees, and every night as a safety net.
 */
@Injectable()
export class AutoRolesService {
  constructor(
    private readonly access: UserAccessRepository,
    private readonly events: EventEmitter2,
  ) {}

  @OnEvent(EMPLOYEES_CHANGED)
  @OnEvent(ORG_CHANGED)
  @Cron('0 3 * * *', { timeZone: 'Asia/Riyadh' })
  async sync(): Promise<void> {
    await this.refresh();
  }

  /** Brings every automatic role up to date now and says how many memberships changed. */
  async refresh(): Promise<number> {
    const changed = await this.access.syncAutoRoles();
    if (changed > 0) this.events.emit(ACCESS_CHANGED, {});
    return changed;
  }
}
