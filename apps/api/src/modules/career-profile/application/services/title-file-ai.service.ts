import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AnalyzeTitleFileInput, CareerTitleContentDto, SaveCareerContentInput, TitleFileResultDto } from '@arweqah-platform/shared';
import { RateWindow } from '../../../../common/application/rate-window';
import { AiService } from '../../../../core/integrations/application/services/ai.service';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { TitleIdentityPort } from '../../domain/contracts/title-identity.port';
import { TitleFileAiRateLimitedError, TitleFileNeedsReviewError } from '../../domain/errors/career-profile.errors';
import { aiTitleFileSchema, partsFromAi, ungroundedOf } from '../../domain/rules/title-file-ai.rules';
import { contentProblems, readingOf } from '../../domain/rules/title-file.rules';
import { CAREER_AUDIT, CAREER_ENTITY, TITLE_FILE_AI_MAX_TOKENS, TITLE_FILE_AI_PER_HOUR, TITLE_FILE_AI_WINDOW_MS } from '../messages/career-profile.messages';
import { TITLE_FILE_AI_SYSTEM, titleFileAiUser } from '../messages/title-file-ai.prompt';
import { CareerContentService } from './career-content.service';

/**
 * Places a title file the fixed reader could not read (plan §2.9, FR-127). `analyze` asks the AI and answers like a dry run: nothing is saved.
 * `confirm` saves what a person reviewed, after the same checks, as a new version.
 */
@Injectable()
export class TitleFileAiService {
  private readonly window = new RateWindow(TITLE_FILE_AI_PER_HOUR, TITLE_FILE_AI_WINDOW_MS);

  constructor(
    private readonly titles: TitleIdentityPort,
    private readonly content: CareerContentService,
    private readonly ai: AiService,
    private readonly events: EventEmitter2,
  ) {}

  async analyze(titleId: string, input: AnalyzeTitleFileInput, actorId: string): Promise<TitleFileResultDto> {
    const title = await this.titles.identity(titleId);
    if (!this.window.take(actorId)) throw new TitleFileAiRateLimitedError();
    const answer = await this.ai.jsonOf({ system: TITLE_FILE_AI_SYSTEM, user: titleFileAiUser(input.text, title.code), schema: aiTitleFileSchema, maxTokens: TITLE_FILE_AI_MAX_TOKENS });
    const parts = partsFromAi(answer.value);
    const reading = readingOf(parts, title.code);
    this.audit(actorId, CAREER_AUDIT.fileAnalysedAi, titleId, { model: answer.model, chars: input.text.length, inputUnits: answer.inputTokens, outputUnits: answer.outputTokens, ...reading.counts });
    return { dryRun: true, saved: false, version: null, counts: reading.counts, problems: reading.problems, codeInFile: reading.codeInFile, ignored: [], source: 'ai', content: reading.content, ungrounded: ungroundedOf(parts, input.text), aiAvailable: true };
  }

  async confirm(titleId: string, input: SaveCareerContentInput, actorId: string): Promise<CareerTitleContentDto> {
    const title = await this.titles.identity(titleId);
    const problems = contentProblems(input.content, title.code);
    if (problems.length) throw new TitleFileNeedsReviewError(problems);
    const saved = await this.content.save(titleId, input, actorId);
    this.audit(actorId, CAREER_AUDIT.fileUploaded, titleId, { version: saved.version, source: 'ai' });
    return saved;
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    this.events.emit(AUDIT_EVENT, { actorId, action, entityType: CAREER_ENTITY, entityId, changes } satisfies AuditEvent);
  }
}
