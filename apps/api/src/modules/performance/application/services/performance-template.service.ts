import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { buildBands, deriveStageTemplate, fiscalEditProblems, scaleEditProblems, stageProblems, type EvalFileInput, type EvalFileResult, type FiscalInput, type ScaleInput, type StageTemplateInput, type TemplatesDto } from '@arweqah-platform/shared';
import { AiService } from '../../../../core/integrations/application/services/ai.service';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { PerformanceTemplateRepository } from '../../domain/contracts/performance-template.repository';
import { EvalFileNeedsReviewError, TemplateNeedsReviewError } from '../../domain/errors/performance.errors';
import { contentOfResult } from '../../domain/rules/eval-file-content.rules';
import { isSound, parseEvalFile } from '../../domain/rules/eval-file.rules';
import { PERFORMANCE_AUDIT, PERFORMANCE_TEMPLATE_ENTITY } from '../messages/performance.messages';

/** The evaluation file: read on the server, checked, and kept only when everything in it is sound (FR-118). */
@Injectable()
export class PerformanceTemplateService {
  constructor(
    private readonly templates: PerformanceTemplateRepository,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
    private readonly ai: AiService,
  ) {}

  /** What the templates kept hold (the readiness list of the cycle page reads it). */
  async current(): Promise<TemplatesDto> {
    const [stages, scale, fiscal] = await Promise.all([this.templates.stages(), this.templates.scale(), this.templates.fiscal()]);
    return { stages, scale, fiscal };
  }

  /** Reads the file; with `dryRun` (the default) it only reports. A file with a part that failed a check is 422 and nothing of it is saved. */
  async read(ctx: AccessContext, input: EvalFileInput): Promise<EvalFileResult> {
    const parsed = parseEvalFile(input.text);
    if (input.dryRun) return { ...parsed, saved: false, content: contentOfResult(parsed), aiAvailable: await safely(() => this.ai.isActive()) };
    if (!isSound(parsed)) throw new EvalFileNeedsReviewError(problemsOf(parsed));
    await this.tx.run(async (tx) => {
      for (const s of parsed.stages) await this.templates.saveStage(s.template, ctx.userId, tx);
      if (parsed.scale) await this.templates.saveScale(parsed.scale.bands, ctx.userId, tx);
      if (parsed.fiscal) await this.templates.saveFiscal(parsed.fiscal.card, ctx.userId, tx);
    });
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action: PERFORMANCE_AUDIT.templateSaved, entityType: PERFORMANCE_TEMPLATE_ENTITY, entityId: null, changes: { stages: parsed.stages.map((s) => s.stage), scale: !!parsed.scale, fiscal: !!parsed.fiscal } } satisfies AuditEvent);
    return { ...parsed, saved: true };
  }

  /** Adds or changes the template of one stage from the form: the basic total and the cap are computed, and a stage that fails a check is 422 `TEMPLATE_NEEDS_REVIEW`. */
  async saveStage(ctx: AccessContext, stage: number, input: StageTemplateInput): Promise<TemplatesDto> {
    const template = deriveStageTemplate(stage, input);
    const problems = stageProblems(template);
    if (problems.length) throw new TemplateNeedsReviewError(problems);
    await this.tx.run((tx) => this.templates.saveStage(template, ctx.userId, tx));
    this.audit(ctx, PERFORMANCE_AUDIT.stageSaved, { stage });
    return this.current();
  }

  /** Removes the template of a stage (404 when none is kept); the readiness list then says the stage is not uploaded. */
  async removeStage(ctx: AccessContext, stage: number): Promise<void> {
    if (!(await this.tx.run((tx) => this.templates.deleteStage(stage, tx)))) throw new NotFoundError('Stage template', String(stage));
    this.audit(ctx, PERFORMANCE_AUDIT.stageRemoved, { stage });
  }

  /** Changes the five bands of the grade scale; the range of each is written from its numbers. */
  async saveScale(ctx: AccessContext, input: ScaleInput): Promise<TemplatesDto> {
    const problems = scaleEditProblems(input.bands);
    if (problems.length) throw new TemplateNeedsReviewError(problems);
    await this.tx.run((tx) => this.templates.saveScale(buildBands(input), ctx.userId, tx));
    this.audit(ctx, PERFORMANCE_AUDIT.scaleSaved, { levels: input.bands.length });
    return this.current();
  }

  /** Changes the fiscal-year card: the kind of each of the twelve months and the notes. */
  async saveFiscal(ctx: AccessContext, input: FiscalInput): Promise<TemplatesDto> {
    const problems = fiscalEditProblems(input.months);
    if (problems.length) throw new TemplateNeedsReviewError(problems);
    await this.tx.run((tx) => this.templates.saveFiscal({ months: input.months, notes: input.notes }, ctx.userId, tx));
    this.audit(ctx, PERFORMANCE_AUDIT.fiscalSaved, { months: input.months.length, notes: input.notes.length });
    return this.current();
  }

  /** The audit keeps what changed, never the words of the template. */
  private audit(ctx: AccessContext, action: string, changes: Record<string, unknown>): void {
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action, entityType: PERFORMANCE_TEMPLATE_ENTITY, entityId: null, changes } satisfies AuditEvent);
  }
}

const problemsOf = (r: ReturnType<typeof parseEvalFile>): string[] => [
  ...r.stages.flatMap((s) => s.problems.map((p) => `stage${s.stage}:${p}`)),
  ...(r.scale?.problems ?? []),
  ...(r.fiscal?.problems ?? []),
  ...(r.stages.length + (r.scale ? 1 : 0) + (r.fiscal ? 1 : 0) === 0 ? ['empty'] : []),
];

/** The AI hint is a convenience: a failure reading the AI settings must never stop the fixed reader. */
async function safely(ask: () => Promise<boolean>): Promise<boolean> {
  try {
    return await ask();
  } catch {
    return false;
  }
}
