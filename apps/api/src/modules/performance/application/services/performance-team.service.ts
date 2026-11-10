import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorePermission, emptyTeamForm, levelOf, scoreOf, teamProblems, type EvalBlock, type ReviewerLevel, type SaveTeamEvaluationInput, type SelfEvaluationDto, type TeamEvaluationDto, type TeamEvaluationPageDto, type TeamEvaluationQuery, type TeamEvaluationRowDto } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { NotificationsService } from '../../../../core/notifications/application/notifications.service';
import { PerformanceCycleRepository, type CycleRow } from '../../domain/contracts/performance-cycle.repository';
import { PerformanceEvaluationRepository, type EvaluationRow, type ReviewRow, type SelfRow } from '../../domain/contracts/performance-evaluation.repository';
import { PerformanceRosterPort, PerformanceStagePort, PerformanceTeamPort, type TeamPerson } from '../../domain/contracts/performance-roster.port';
import { EvaluationBlockedError, TeamEvaluationInvalidError } from '../../domain/errors/performance.errors';
import { emptySelf } from '../../domain/rules/self-evaluation.rules';
import { cleanTeam, evalBlock, pickedPoints, reviewState, reviewerLevel } from '../../domain/rules/team-evaluation.rules';
import { PERFORMANCE_AUDIT, PERFORMANCE_EVALUATION_ENTITY } from '../messages/performance.messages';

/** One member in the cycle: the person, their evaluation, and the documents written so far. */
interface Target {
  cycle: CycleRow;
  person: TeamPerson;
  evaluation: EvaluationRow;
  reviews: ReviewRow[];
  level: ReviewerLevel;
}

const levelNameOf = (scale: Parameters<typeof levelOf>[0], score: { final: number } | null): string | null => (score ? levelOf(scale, score.final)?.name ?? null : null);
const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);
const reviewOf = (reviews: readonly ReviewRow[], level: ReviewerLevel): ReviewRow | undefined => reviews.find((r) => r.level === level);

/** What the viewer sees in the form: their own document, or (the upper manager's start) a copy of the direct manager's; the direct manager's is shown to the upper manager only. */
function formsOf(t: Pick<Target, 'reviews' | 'level'>): { form: SaveTeamEvaluationInput; sentAt: string | null; directForm: SaveTeamEvaluationInput | null; started: boolean } {
  const own = reviewOf(t.reviews, t.level);
  const direct = t.level === 'upper' ? reviewOf(t.reviews, 'direct') : undefined;
  return { form: (own ?? direct)?.content ?? emptyTeamForm(), sentAt: iso(own?.sentAt), directForm: direct?.content ?? null, started: !!(own ?? direct) };
}

const selfDto = (self: SelfRow | null): SelfEvaluationDto => ({ ...(self?.content ?? emptySelf()), sentAt: iso(self?.sentAt) });

/** The manager's side of the evaluation (FR-120): the team list, one member's evaluation, and writing it (a draft, then the send). */
@Injectable()
export class PerformanceTeamService {
  constructor(
    private readonly team: PerformanceTeamPort,
    private readonly roster: PerformanceRosterPort,
    private readonly stages: PerformanceStagePort,
    private readonly cycles: PerformanceCycleRepository,
    private readonly evaluations: PerformanceEvaluationRepository,
    private readonly notifications: NotificationsService,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  /** The people the viewer's scope reaches who have an evaluation in the cycle in progress, with the viewer's state for each. */
  async list(ctx: AccessContext, query: TeamEvaluationQuery): Promise<TeamEvaluationPageDto> {
    const filter = ctx.filterFor(CorePermission.PerformanceTeamView);
    const cycle = await this.cycles.current();
    if (!filter) throw new NotFoundError('Team');
    if (!cycle) return { cycle: null, items: [], total: 0, page: query.page, pageSize: query.pageSize, waitingCount: 0 };
    const people = await this.team.members(filter, { search: query.search, directOnly: query.scope === 'direct' });
    const evaluations = await this.evaluations.forEmployees(cycle.id, people.map((p) => p.employeeId));
    const ids = evaluations.map((e) => e.id);
    const [reviews, selfSent] = await Promise.all([this.evaluations.reviews(ids), this.evaluations.selfSentIds(ids)]);
    const rows = await Promise.all(evaluations.map((e) => this.row({ cycle, evaluation: e, person: people.find((p) => p.employeeId === e.employeeId) as TeamPerson, reviews: reviews.filter((r) => r.evaluationId === e.id) }, ctx.userId, selfSent.has(e.id))));
    const shown = rows.filter((r) => !query.status || (query.status === 'done') === (r.mine === 'sent'));
    const start = (query.page - 1) * query.pageSize;
    return { cycle: { fiscalYear: cycle.fiscalYear, stage: cycle.stage }, items: shown.slice(start, start + query.pageSize), total: shown.length, page: query.page, pageSize: query.pageSize, waitingCount: rows.filter((r) => r.mine !== 'sent' && !r.block).length };
  }

  /** One member's evaluation for the viewer; a person the scope does not reach, or without an evaluation, is a 404. */
  async one(ctx: AccessContext, employeeId: string): Promise<TeamEvaluationDto> {
    return this.view(await this.target(ctx, CorePermission.PerformanceTeamView, employeeId));
  }

  /** Keeps the form: a draft before the first send; after it the form must stay complete. */
  async save(ctx: AccessContext, employeeId: string, input: SaveTeamEvaluationInput): Promise<TeamEvaluationDto> {
    const t = await this.writable(ctx, employeeId);
    const catalog = await this.cycles.catalog(t.cycle.id);
    const own = reviewOf(t.reviews, t.level);
    if (own?.sentAt) this.assertComplete(t, input, catalog);
    await this.tx.run((tx) => this.evaluations.saveReview({ evaluationId: t.evaluation.id, level: t.level, reviewerUserId: ctx.userId, content: cleanTeam(input, catalog), sentAt: own?.sentAt ?? null }, tx));
    this.audit(ctx, own?.sentAt ? PERFORMANCE_AUDIT.teamEdited : PERFORMANCE_AUDIT.teamSaved, t.evaluation.id);
    return this.one(ctx, employeeId);
  }

  /** Sends the form: it must be complete. The direct manager's first send tells the upper manager. */
  async send(ctx: AccessContext, employeeId: string, input: SaveTeamEvaluationInput): Promise<TeamEvaluationDto> {
    const t = await this.writable(ctx, employeeId);
    const catalog = await this.cycles.catalog(t.cycle.id);
    this.assertComplete(t, input, catalog);
    const own = reviewOf(t.reviews, t.level);
    const first = !own?.sentAt;
    await this.tx.run(async (tx) => {
      await this.evaluations.saveReview({ evaluationId: t.evaluation.id, level: t.level, reviewerUserId: ctx.userId, content: cleanTeam(input, catalog), sentAt: own?.sentAt ?? this.clock.now() }, tx);
      if (first && t.level === 'direct' && t.person.upperManagerUserId) await this.tellUpper(t, tx);
    });
    this.audit(ctx, first ? PERFORMANCE_AUDIT.teamSent : PERFORMANCE_AUDIT.teamEdited, t.evaluation.id);
    return this.one(ctx, employeeId);
  }

  private async tellUpper(t: Target, tx: Parameters<Parameters<TransactionRunner['run']>[0]>[0]): Promise<void> {
    await this.notifications.notify({
      userIds: [t.person.upperManagerUserId as string], tx, coalesce: true, link: '/performance-team',
      titleAr: 'تقييم بانتظار مراجعتك', titleEn: 'An evaluation is waiting for your review',
      bodyAr: `${t.person.managerName ?? ''} أرسل تقييم ${t.person.name}.`, bodyEn: `${t.person.managerName ?? ''} sent the evaluation of ${t.person.name}.`,
    });
  }

  private assertComplete(t: Target, input: SaveTeamEvaluationInput, catalog: Awaited<ReturnType<PerformanceCycleRepository['catalog']>>): void {
    const template = this.template(t.cycle, t.evaluation);
    const problems = teamProblems(template, input, catalog);
    if (problems.length) throw new TeamEvaluationInvalidError(problems);
  }

  private template(cycle: CycleRow, evaluation: EvaluationRow) {
    const found = cycle.snapshot.stages.find((s) => s.stage === evaluation.stageNo);
    if (!found) throw new NotFoundError('Template', String(evaluation.stageNo));
    return found;
  }

  /** The target for writing: in the scope of the writing key, and not blocked (409 with the reason). */
  private async writable(ctx: AccessContext, employeeId: string): Promise<Target> {
    const t = await this.target(ctx, CorePermission.PerformanceTeamEvaluate, employeeId);
    const block = this.blockOf(t);
    if (block) throw new EvaluationBlockedError(block);
    return t;
  }

  private blockOf(t: Pick<Target, 'cycle' | 'level' | 'reviews'>): EvalBlock | null {
    return evalBlock(t.cycle.stage, t.level, t.reviews.some((r) => r.level === 'direct' && !!r.sentAt));
  }

  private async target(ctx: AccessContext, key: string, employeeId: string): Promise<Target> {
    const filter = ctx.filterFor(key);
    const cycle = await this.cycles.current();
    const person = filter ? await this.team.member(filter, employeeId) : null;
    const evaluation = cycle && person ? (await this.evaluations.forEmployees(cycle.id, [employeeId]))[0] : undefined;
    if (!cycle || !person || !evaluation) throw new NotFoundError('Evaluation', employeeId);
    const reviews = await this.evaluations.reviews([evaluation.id]);
    return { cycle, person, evaluation, reviews, level: reviewerLevel(ctx.userId, person.managerUserId, reviewOf(reviews, 'direct')?.reviewerUserId ?? null) };
  }

  private async row(t: Omit<Target, 'level'>, viewerUserId: string, selfSent: boolean): Promise<TeamEvaluationRowDto> {
    const level = reviewerLevel(viewerUserId, t.person.managerUserId, reviewOf(t.reviews, 'direct')?.reviewerUserId ?? null);
    const shown = [reviewOf(t.reviews, 'upper'), reviewOf(t.reviews, 'direct')].find((r) => r?.sentAt);
    const score = shown ? await this.score(t, shown.content) : null;
    const names = await this.stages.titleNames(t.person.titleId);
    return {
      employeeId: t.person.employeeId, name: t.person.name, titleNameAr: names.nameAr, titleNameEn: names.nameEn,
      directManagerName: t.person.managerUserId === viewerUserId ? null : t.person.managerName, isDirect: t.person.managerUserId === viewerUserId, selfSent,
      mine: reviewState(reviewOf(t.reviews, level)), score: score?.final ?? null, levelName: levelNameOf(t.cycle.snapshot.scale, score), block: this.blockOf({ ...t, level }),
    };
  }

  private async score(t: Pick<Target, 'cycle' | 'evaluation' | 'person'>, form: SaveTeamEvaluationInput) {
    const template = this.template(t.cycle, t.evaluation);
    const [catalog, minutes, stage] = await Promise.all([this.cycles.catalog(t.cycle.id), this.roster.approvedLearningMinutes(t.person.employeeId), this.stages.stageOf(t.person.titleId)]);
    return scoreOf({
      template, results: template.criteria.map((_, i) => form.results[String(i)]),
      behaviours: Object.fromEntries(Object.entries(form.behaviours).map(([code, v]) => [code, v.level])) as never,
      learning: { approvedMinutes: minutes, stageMinutes: (stage?.hoursPerYear ?? 0) * 60 },
      picks: { init: pickedPoints(form.initIds, 'init', catalog), growth: pickedPoints(form.growthIds, 'growth', catalog) },
      caps: { init: template.extra[1]?.points ?? 0, growth: template.extra[2]?.points ?? 0 },
    });
  }

  private async view(t: Target): Promise<TeamEvaluationDto> {
    const template = this.template(t.cycle, t.evaluation);
    const [self, catalog, minutes, stage, names] = await Promise.all([this.evaluations.self(t.evaluation.id), this.cycles.catalog(t.cycle.id), this.roster.approvedLearningMinutes(t.person.employeeId), this.stages.stageOf(t.person.titleId), this.stages.titleNames(t.person.titleId)]);
    const forms = formsOf(t);
    const score = forms.started ? await this.score(t, forms.form) : null;
    const caps = { init: template.extra[1]?.points ?? 0, growth: template.extra[2]?.points ?? 0 };
    return {
      employeeId: t.person.employeeId, name: t.person.name, titleNameAr: names.nameAr, titleNameEn: names.nameEn, stage: t.evaluation.stageNo, template, scale: t.cycle.snapshot.scale, fiscal: t.cycle.snapshot.fiscal,
      catalog, catalogCaps: caps, learning: { approvedMinutes: minutes, stageMinutes: (stage?.hoursPerYear ?? 0) * 60 },
      self: selfDto(self), level: t.level, directManagerName: t.person.managerName, upperManagerName: t.person.upperManagerName,
      form: forms.form, sentAt: forms.sentAt, directForm: forms.directForm, block: this.blockOf(t), score, levelName: levelNameOf(t.cycle.snapshot.scale, score),
    };
  }

  private audit(ctx: AccessContext, action: string, evaluationId: string): void {
    this.events.emit(AUDIT_EVENT, { actorId: ctx.userId, action, entityType: PERFORMANCE_EVALUATION_ENTITY, entityId: evaluationId } satisfies AuditEvent);
  }
}
