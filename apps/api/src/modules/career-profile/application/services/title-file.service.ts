import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ExtractTitleFileInput, TitleFileResultDto } from '@arweqah-platform/shared';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { AiService } from '../../../../core/integrations/application/services/ai.service';
import { TitleIdentityPort } from '../../domain/contracts/title-identity.port';
import { TitleFileNeedsReviewError } from '../../domain/errors/career-profile.errors';
import { readTitleFile, type TitleFileReading } from '../../domain/rules/title-file.rules';
import { CAREER_AUDIT, CAREER_ENTITY } from '../messages/career-profile.messages';
import { CareerContentService } from './career-content.service';

/** Reads a title file into the career content: a dry run reports what the file holds, a real run saves it (a new version) when nothing is left to fix. */
@Injectable()
export class TitleFileService {
  constructor(
    private readonly titles: TitleIdentityPort,
    private readonly content: CareerContentService,
    private readonly ai: AiService,
    private readonly events: EventEmitter2,
  ) {}

  async extract(titleId: string, input: ExtractTitleFileInput, actorId: string): Promise<TitleFileResultDto> {
    const title = await this.titles.identity(titleId);
    const reading = readTitleFile(input.text, title.code);
    // Asked only when the reader found something to fix: the dialog offers the AI button then (and a save does not need to know).
    const aiAvailable = reading.problems.length > 0 && (await this.ai.isActive());
    if (input.dryRun) return resultOf(reading, { dryRun: true, version: null, aiAvailable });
    if (reading.problems.length) throw new TitleFileNeedsReviewError(reading.problems);
    const saved = await this.content.save(titleId, { content: reading.content }, actorId);
    this.events.emit(AUDIT_EVENT, { actorId, action: CAREER_AUDIT.fileUploaded, entityType: CAREER_ENTITY, entityId: titleId, changes: { version: saved.version, ...reading.counts } } satisfies AuditEvent);
    return resultOf(reading, { dryRun: false, version: saved.version, aiAvailable });
  }
}

function resultOf(reading: TitleFileReading, run: { dryRun: boolean; version: number | null; aiAvailable: boolean }): TitleFileResultDto {
  return { dryRun: run.dryRun, saved: run.version !== null, version: run.version, counts: reading.counts, problems: reading.problems, codeInFile: reading.codeInFile, ignored: reading.ignored, source: 'rules', content: null, ungrounded: [], aiAvailable: run.aiAvailable };
}
