import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EMPTY_CAREER_CONTENT, type CareerTitleContentDto, type SaveCareerContentInput } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { CareerContentRepository } from '../../domain/contracts/career-content.repository';
import { TitleIdentityPort } from '../../domain/contracts/title-identity.port';
import { CareerContentNotReadyError, CareerContentStaleError } from '../../domain/errors/career-profile.errors';
import { careerReadinessProblems } from '../../domain/rules/career-readiness.rules';
import { CAREER_AUDIT, CAREER_ENTITY } from '../messages/career-profile.messages';
import { toCareerContentDto, withUnitIds } from '../transformers/career-content.transformer';

/** The career-path content of a job title: read it, save it (one version per save), and set it ready for the employees or back to draft. */
@Injectable()
export class CareerContentService {
  constructor(
    private readonly content: CareerContentRepository,
    private readonly titles: TitleIdentityPort,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  async get(titleId: string): Promise<CareerTitleContentDto> {
    const title = await this.titles.identity(titleId);
    return toCareerContentDto(title, await this.content.find(titleId));
  }

  /** Replaces the whole document. A save made on an older version than the stored one is a 409 (two editors never overwrite each other). */
  async save(titleId: string, input: SaveCareerContentInput, actorId: string): Promise<CareerTitleContentDto> {
    const title = await this.titles.identity(titleId);
    const saved = await this.tx.run(async (tx) => {
      const current = await this.content.lock(titleId, tx);
      const version = current?.version ?? 0;
      if (input.expectedVersion !== undefined && input.expectedVersion !== version) throw new CareerContentStaleError(input.expectedVersion, version);
      return this.content.save({ titleId, content: withUnitIds(input.content), status: current?.status ?? 'draft', version: version + 1, actorId }, tx);
    });
    this.audit(actorId, CAREER_AUDIT.contentSaved, titleId, { version: saved.version });
    return toCareerContentDto(title, saved);
  }

  /** Sets the path ready (visible to the title's holders) once nothing is missing; the problems come back as the error details otherwise. */
  async publish(titleId: string, actorId: string): Promise<CareerTitleContentDto> {
    const title = await this.titles.identity(titleId);
    const stored = await this.tx.run(async (tx) => {
      const current = await this.content.lock(titleId, tx);
      const problems = careerReadinessProblems(current?.content ?? EMPTY_CAREER_CONTENT);
      if (!current || problems.length) throw new CareerContentNotReadyError(problems);
      await this.content.setStatus(titleId, 'ready', actorId, tx);
      return { ...current, status: 'ready' as const };
    });
    this.audit(actorId, CAREER_AUDIT.contentPublished, titleId, { version: stored.version });
    return toCareerContentDto(title, stored);
  }

  async draft(titleId: string, actorId: string): Promise<CareerTitleContentDto> {
    const title = await this.titles.identity(titleId);
    const stored = await this.tx.run(async (tx) => {
      const current = await this.content.lock(titleId, tx);
      if (current && current.status !== 'draft') await this.content.setStatus(titleId, 'draft', actorId, tx);
      return current && { ...current, status: 'draft' as const };
    });
    if (stored) this.audit(actorId, CAREER_AUDIT.contentDrafted, titleId, { version: stored.version });
    return toCareerContentDto(title, stored);
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    this.events.emit(AUDIT_EVENT, { actorId, action, entityType: CAREER_ENTITY, entityId, changes } satisfies AuditEvent);
  }
}
