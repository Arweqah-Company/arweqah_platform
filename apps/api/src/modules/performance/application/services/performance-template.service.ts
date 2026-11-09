import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { EvalFileInput, EvalFileResult, TemplatesDto } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { PerformanceTemplateRepository } from '../../domain/contracts/performance-template.repository';
import { EvalFileNeedsReviewError } from '../../domain/errors/performance.errors';
import { isSound, parseEvalFile } from '../../domain/rules/eval-file.rules';
import { PERFORMANCE_AUDIT, PERFORMANCE_TEMPLATE_ENTITY } from '../messages/performance.messages';

/** The evaluation file: read on the server, checked, and kept only when everything in it is sound (FR-118). */
@Injectable()
export class PerformanceTemplateService {
  constructor(
    private readonly templates: PerformanceTemplateRepository,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  /** What the templates kept hold (the readiness list of the cycle page reads it). */
  async current(): Promise<TemplatesDto> {
    const [stages, scale, fiscal] = await Promise.all([this.templates.stages(), this.templates.scale(), this.templates.fiscal()]);
    return { stages, scale, fiscal };
  }

  /** Reads the file; with `dryRun` (the default) it only reports. A file with a part that failed a check is 422 and nothing of it is saved. */
  async read(ctx: AccessContext, input: EvalFileInput): Promise<EvalFileResult> {
    const parsed = parseEvalFile(input.text);
    if (input.dryRun) return { ...parsed, saved: false };
    if (!isSound(parsed)) throw new EvalFileNeedsReviewError(problemsOf(parsed));
    await this.tx.run(async (tx) => {
      for (const s of parsed.stages) await this.templates.saveStage(s.template, ctx.userId, tx);
      if (parsed.scale) await this.templates.saveScale(parsed.scale.bands, ctx.userId, tx);
      if (parsed.fiscal) await this.templates.saveFiscal(parsed.fiscal.card, ctx.userId, tx);
    });
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action: PERFORMANCE_AUDIT.templateSaved, entityType: PERFORMANCE_TEMPLATE_ENTITY, entityId: null, changes: { stages: parsed.stages.map((s) => s.stage), scale: !!parsed.scale, fiscal: !!parsed.fiscal } } satisfies AuditEvent);
    return { ...parsed, saved: true };
  }
}

const problemsOf = (r: ReturnType<typeof parseEvalFile>): string[] => [
  ...r.stages.flatMap((s) => s.problems.map((p) => `stage${s.stage}:${p}`)),
  ...(r.scale?.problems ?? []),
  ...(r.fiscal?.problems ?? []),
  ...(r.stages.length + (r.scale ? 1 : 0) + (r.fiscal ? 1 : 0) === 0 ? ['empty'] : []),
];
