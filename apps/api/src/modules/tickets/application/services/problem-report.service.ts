import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CreateProblemReportInput, ProblemReportAvailabilityDto, ProblemReportResultDto } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { ProblemReportRepository } from '../../domain/contracts/problem-report.repository';
import { ProblemReportRateLimitedError, ProblemReportsOffError } from '../../domain/errors/problem-report.errors';
import { imageMayGoToAi, isReady, windowStart, withinLimit } from '../../domain/rules/problem-report.rules';
import type { TicketViewer } from '../../domain/types/ticket.types';
import { ticketDetails, ticketTitle } from '../messages/problem-report.messages';
import { TICKET_AUDIT } from '../messages/ticket.messages';
import { ProblemReportAnalyzer } from './problem-report-analyzer.service';
import { ProblemReportSettingsService } from './problem-report-settings.service';
import { TicketsService } from './tickets.service';

/** «Report a problem»: the screen's report becomes a ticket of the type the administrator chose, sent by the employee. */
@Injectable()
export class ProblemReportService {
  constructor(
    private readonly repo: ProblemReportRepository,
    private readonly settings: ProblemReportSettingsService,
    private readonly analyzer: ProblemReportAnalyzer,
    private readonly tickets: TicketsService,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  /** Whether the button shows for this person now (the key is checked by the route). */
  async availability(): Promise<ProblemReportAvailabilityDto> {
    const s = await this.settings.get();
    const available = isReady(s) && (await this.settings.isUsable(s.ticketTypeId as string));
    return { available, imageToAi: imageMayGoToAi(s) };
  }

  async create(viewer: TicketViewer, input: CreateProblemReportInput): Promise<ProblemReportResultDto> {
    const s = await this.settings.get();
    if (!isReady(s) || !(await this.settings.isUsable(s.ticketTypeId as string))) throw new ProblemReportsOffError();
    const typeId = s.ticketTypeId as string;
    if (!withinLimit(await this.repo.recentCount(viewer.userId, typeId, windowStart(this.clock.now())), s.maxPerHour)) throw new ProblemReportRateLimitedError();
    const analysis = s.analyzeWithAi ? await this.analyzer.analyze({ userId: viewer.userId, note: input.note, context: input.context, imageFileId: imageMayGoToAi(s) ? (input.fileId ?? null) : null }) : null;
    const ticket = await this.tickets.create(viewer, {
      typeId,
      title: ticketTitle(analysis, input.context),
      details: ticketDetails({ analysis, note: input.note, context: input.context, hasScreenshot: Boolean(input.fileId) }),
      priority: 0,
      fileIds: input.fileId ? [input.fileId] : [],
    });
    const event: AuditEvent = { actorId: viewer.userId, action: TICKET_AUDIT.problemReported, entityType: 'ticket', entityId: ticket.id, changes: { analyzed: analysis !== null, screenshot: Boolean(input.fileId) } };
    this.events.emit(AUDIT_EVENT, event);
    return { ticketId: ticket.id, ticketNumber: ticket.number, analyzed: analysis !== null };
  }
}
