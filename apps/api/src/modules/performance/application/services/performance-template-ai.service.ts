import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AnalyzeEvalFileInput, ConfirmEvalFileInput, EvalFileResult } from '@arweqah-platform/shared';
import { RateWindow } from '../../../../common/application/rate-window';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { AiService } from '../../../../core/integrations/application/services/ai.service';
import { PerformanceTemplateRepository } from '../../domain/contracts/performance-template.repository';
import { EvalFileAiRateLimitedError, TemplateNeedsReviewError } from '../../domain/errors/performance.errors';
import { aiEvalFileSchema, contentFromAi, ungroundedOf } from '../../domain/rules/eval-file-ai.rules';
import { resultOfContent } from '../../domain/rules/eval-file-content.rules';
import { EVAL_FILE_AI_MAX_TOKENS, EVAL_FILE_AI_PER_HOUR, EVAL_FILE_AI_WINDOW_MS, PERFORMANCE_AUDIT, PERFORMANCE_TEMPLATE_ENTITY } from '../messages/performance.messages';
import { EVAL_FILE_AI_SYSTEM, evalFileAiUser } from '../messages/eval-file-ai.prompt';

/**
 * Places an evaluation file the fixed reader could not read. `analyze` asks the AI and answers like a dry run: nothing is saved.
 * `confirm` saves what a person reviewed, after the same checks as the forms and the file.
 */
@Injectable()
export class PerformanceTemplateAiService {
  private readonly window = new RateWindow(EVAL_FILE_AI_PER_HOUR, EVAL_FILE_AI_WINDOW_MS);

  constructor(
    private readonly templates: PerformanceTemplateRepository,
    private readonly ai: AiService,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  async analyze(ctx: AccessContext, input: AnalyzeEvalFileInput): Promise<EvalFileResult> {
    if (!this.window.take(ctx.userId)) throw new EvalFileAiRateLimitedError();
    const answer = await this.ask(input.text, ctx.userId);
    const content = contentFromAi(answer.value);
    const result = resultOfContent(content);
    this.audit(ctx, PERFORMANCE_AUDIT.fileAnalysedAi, { model: answer.model, chars: input.text.length, inputUnits: answer.inputTokens, outputUnits: answer.outputTokens, stages: content.stages.length, scale: !!content.scale, fiscal: !!content.fiscal });
    return { ...result, saved: false, source: 'ai', ungrounded: ungroundedOf(content, input.text), aiAvailable: true };
  }

  /** The AI call; a turn of the hourly limit is spent only when the service answered (an outage must not use up a person's six). */
  private async ask(text: string, userId: string) {
    try {
      return await this.ai.jsonOf({ system: EVAL_FILE_AI_SYSTEM, user: evalFileAiUser(text), schema: aiEvalFileSchema, maxTokens: EVAL_FILE_AI_MAX_TOKENS });
    } catch (error) {
      this.window.refund(userId);
      throw error;
    }
  }

  async confirm(ctx: AccessContext, input: ConfirmEvalFileInput): Promise<EvalFileResult> {
    const result = resultOfContent(input.content);
    const problems = [...result.stages.flatMap((s) => s.problems.map((p) => `stage${s.stage}:${p}`)), ...(result.scale?.problems ?? []), ...(result.fiscal?.problems ?? []), ...(result.stages.length + (result.scale ? 1 : 0) + (result.fiscal ? 1 : 0) === 0 ? ['empty'] : [])];
    if (problems.length) throw new TemplateNeedsReviewError(problems);
    await this.tx.run(async (tx) => {
      for (const s of result.stages) await this.templates.saveStage(s.template, ctx.userId, tx);
      if (result.scale) await this.templates.saveScale(result.scale.bands, ctx.userId, tx);
      if (result.fiscal) await this.templates.saveFiscal(result.fiscal.card, ctx.userId, tx);
    });
    this.audit(ctx, PERFORMANCE_AUDIT.templateSaved, { stages: result.stages.map((s) => s.stage), scale: !!result.scale, fiscal: !!result.fiscal, source: 'ai' });
    return { ...result, saved: true, source: 'ai' };
  }

  private audit(ctx: AccessContext, action: string, changes: Record<string, unknown>): void {
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action, entityType: PERFORMANCE_TEMPLATE_ENTITY, entityId: null, changes } satisfies AuditEvent);
  }
}
