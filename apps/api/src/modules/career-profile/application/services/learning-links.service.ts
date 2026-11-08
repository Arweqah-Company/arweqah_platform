import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ImportLearningLinksInput, LearningImportResultDto, LearningImportRowResultDto } from '@arweqah-platform/shared';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { CareerContentRepository } from '../../domain/contracts/career-content.repository';
import { CareerContentStaleError } from '../../domain/errors/career-profile.errors';
import { planLearningLinks, type LinksPlan } from '../../domain/rules/learning-links.rules';
import { CAREER_AUDIT, CAREER_ENTITY } from '../messages/career-profile.messages';
import { CareerContentService } from './career-content.service';

/** The learning-links sheet: a dry run reports what each row would do; a real run saves each changed title as a new version (a title changed by someone else meanwhile is refused, row by row). */
@Injectable()
export class LearningLinksService {
  constructor(
    private readonly content: CareerContentRepository,
    private readonly saves: CareerContentService,
    private readonly events: EventEmitter2,
  ) {}

  async import(input: ImportLearningLinksInput, actorId: string): Promise<LearningImportResultDto> {
    const codes = [...new Set(input.rows.map((r) => r.titleCode.toUpperCase()))];
    const plan = planLearningLinks(input.rows, await this.content.findByCodes(codes));
    const rows = input.dryRun ? plan.rows : await this.apply(plan, actorId);
    const count = (status: LearningImportRowResultDto['status']) => rows.filter((r) => r.status === status).length;
    if (!input.dryRun) this.events.emit(AUDIT_EVENT, { actorId, action: CAREER_AUDIT.learningLinksImported, entityType: CAREER_ENTITY, entityId: 'learning-links', changes: { updated: count('updated'), unchanged: count('unchanged'), rejected: count('rejected') } } satisfies AuditEvent);
    return { dryRun: input.dryRun, updated: count('updated'), unchanged: count('unchanged'), rejected: count('rejected'), rows };
  }

  /** Saves the changed titles one by one; the rows of a title that changed since it was read are refused. */
  private async apply(plan: LinksPlan, actorId: string): Promise<LearningImportRowResultDto[]> {
    const rows = plan.rows.map((r) => ({ ...r }));
    for (const change of plan.changes) {
      try {
        await this.saves.save(change.titleId, { content: change.content, expectedVersion: change.version }, actorId);
      } catch (error) {
        if (!(error instanceof CareerContentStaleError)) throw error;
        for (const n of change.rows) rows[n - 1] = { row: n, status: 'rejected', reason: 'content_changed' };
      }
    }
    return rows;
  }
}
