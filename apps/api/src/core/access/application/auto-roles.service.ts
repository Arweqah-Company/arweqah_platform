import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { UserAccessRepository } from '../domain/access.repository';
import { ACCESS_CHANGED, EMPLOYEES_CHANGED } from './access.events';

/**
 * Keeps the members of the automatic roles right: "everyone" (the employee role) and "has_reports" (the direct manager role).
 * Runs after every change to employees, and every night as a safety net.
 */
@Injectable()
export class AutoRolesService {
  constructor(
    private readonly access: UserAccessRepository,
    private readonly events: EventEmitter2,
  ) {}

  @OnEvent(EMPLOYEES_CHANGED)
  @Cron('0 3 * * *', { timeZone: 'Asia/Riyadh' })
  async sync(): Promise<void> {
    if ((await this.access.syncAutoRoles()) > 0) this.events.emit(ACCESS_CHANGED, {});
  }
}
