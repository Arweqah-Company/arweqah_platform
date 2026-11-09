import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorePermission, type CareerContent, type CompetencyStatusDto, type RecordCompetencyInput } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { CareerCompetencyRepository } from '../../domain/contracts/career-competency.repository';
import { CareerContentRepository } from '../../domain/contracts/career-content.repository';
import { CareerTeamPort } from '../../domain/contracts/career-team.port';
import { competencyStatuses } from '../../domain/rules/competency.rules';
import { CAREER_AUDIT, CAREER_ENTITY } from '../messages/career-profile.messages';

/** The levels of the technical competencies of a title the manager recorded for an employee (FR-117). */
@Injectable()
export class CareerCompetencyService {
  constructor(
    private readonly levels: CareerCompetencyRepository,
    private readonly content: CareerContentRepository,
    private readonly team: CareerTeamPort,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  /** The competencies of the content with the level recorded for the employee. */
  async statuses(employeeId: string, content: CareerContent): Promise<CompetencyStatusDto[]> {
    const recorded = new Map((await this.levels.forEmployee(employeeId)).map((r) => [r.competency, r.level]));
    return competencyStatuses(content, recorded);
  }

  /** Records (or takes back) the level of one competency of a person the viewer's scope reaches; a competency the title does not ask for is a 404. */
  async record(ctx: AccessContext, employeeId: string, input: RecordCompetencyInput): Promise<CompetencyStatusDto[]> {
    const filter = ctx.filterFor(CorePermission.CareerCompetencyRecord);
    const person = filter ? await this.team.member(filter, employeeId) : null;
    const stored = person?.titleId ? await this.content.find(person.titleId) : null;
    if (!person || stored?.status !== 'ready') throw new NotFoundError('Employee', employeeId);
    const asked = competencyStatuses(stored.content, new Map()).some((c) => c.name === input.competency);
    if (!asked) throw new NotFoundError('Competency', input.competency);
    await this.tx.run((tx) => this.levels.set({ employeeId, competency: input.competency, level: input.level, recordedBy: ctx.userId, at: this.clock.now() }, tx));
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action: CAREER_AUDIT.competencyRecorded, entityType: CAREER_ENTITY, entityId: person.titleId as string, changes: { employeeId, competency: input.competency, level: input.level } } satisfies AuditEvent);
    return this.statuses(employeeId, stored.content);
  }
}
