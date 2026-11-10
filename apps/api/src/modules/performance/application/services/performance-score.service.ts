import { Injectable } from '@nestjs/common';
import { scoreOf, type CatalogItemDto, type ScoreParts, type SaveTeamEvaluationInput, type StageTemplate } from '@arweqah-platform/shared';
import { PerformanceCycleRepository } from '../../domain/contracts/performance-cycle.repository';
import { PerformanceRosterPort, PerformanceStagePort } from '../../domain/contracts/performance-roster.port';
import { pickedPoints } from '../../domain/rules/team-evaluation.rules';

/** Who is scored and with what: the person, their stage template, the cycle's catalog and the form a manager wrote. */
export interface ScoreSubject {
  employeeId: string;
  titleId: string;
  template: StageTemplate;
  catalog: readonly CatalogItemDto[];
  form: SaveTeamEvaluationInput;
  /** The calibration adjustment, when scoring after calibration. */
  adjust?: number;
}

/** The score of a person from a manager's form (plan §3.3): the one place the server computes it, for «team evaluation», calibration and the frozen result. */
@Injectable()
export class PerformanceScoreService {
  constructor(
    private readonly roster: PerformanceRosterPort,
    private readonly stages: PerformanceStagePort,
    private readonly cycles: PerformanceCycleRepository,
  ) {}

  async of(subject: ScoreSubject): Promise<ScoreParts> {
    const { template, form, catalog } = subject;
    const [minutes, stage] = await Promise.all([this.roster.approvedLearningMinutes(subject.employeeId), this.stages.stageOf(subject.titleId)]);
    return scoreOf({
      template, results: template.criteria.map((_, i) => form.results[String(i)]),
      behaviours: Object.fromEntries(Object.entries(form.behaviours).map(([code, v]) => [code, v.level])) as never,
      learning: { approvedMinutes: minutes, stageMinutes: (stage?.hoursPerYear ?? 0) * 60 },
      picks: { init: pickedPoints(form.initIds, 'init', catalog), growth: pickedPoints(form.growthIds, 'growth', catalog) },
      caps: { init: template.extra[1]?.points ?? 0, growth: template.extra[2]?.points ?? 0 },
      adjust: subject.adjust,
    });
  }

  /** The catalog of a cycle (one read for many scores). */
  catalogOf(cycleId: string): Promise<CatalogItemDto[]> {
    return this.cycles.catalog(cycleId);
  }
}
