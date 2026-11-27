import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ProblemReportSettingsDto, ProblemReportSettingsInput, ProblemReportTypeOptionDto } from '@arweqah-platform/shared';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { ProblemReportRepository } from '../../domain/contracts/problem-report.repository';
import { ProblemReportTypeInvalidError } from '../../domain/errors/problem-report.errors';
import { TICKET_AUDIT } from '../messages/ticket.messages';
import { TicketCatalogService } from './ticket-catalog.service';

/** The settings of the «report a problem» button, and the ticket types the administrator may choose for it. */
@Injectable()
export class ProblemReportSettingsService {
  constructor(
    private readonly repo: ProblemReportRepository,
    private readonly catalog: TicketCatalogService,
    private readonly events: EventEmitter2,
  ) {}

  get(): Promise<ProblemReportSettingsDto> {
    return this.repo.settings();
  }

  /** Every ticket type a report may become: not personal, of a department that receives tickets now. */
  async types(): Promise<ProblemReportTypeOptionDto[]> {
    const { desks } = await this.catalog.catalog();
    return desks
      .filter((desk) => desk.unavailableReason === null)
      .flatMap((desk) => desk.types.filter((t) => !t.isPersonal && t.available).map((t) => ({ typeId: t.id, nameAr: t.nameAr, nameEn: t.nameEn, deskNameAr: desk.nameAr, deskNameEn: desk.nameEn })));
  }

  async isUsable(typeId: string): Promise<boolean> {
    return (await this.types()).some((t) => t.typeId === typeId);
  }

  async update(input: ProblemReportSettingsInput, actorId: string): Promise<ProblemReportSettingsDto> {
    if (input.ticketTypeId && !(await this.isUsable(input.ticketTypeId))) throw new ProblemReportTypeInvalidError();
    if (input.enabled && !input.ticketTypeId) throw new ProblemReportTypeInvalidError();
    await this.repo.saveSettings(input, actorId);
    const event: AuditEvent = { actorId, action: TICKET_AUDIT.problemReportSettingsUpdated, entityType: 'problem_report_settings', entityId: 'problem-reports', changes: input };
    this.events.emit(AUDIT_EVENT, event);
    return this.repo.settings();
  }
}
