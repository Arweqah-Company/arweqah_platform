import { Injectable } from '@nestjs/common';
import { CorePermission, riyadhToday, type TeamMemberDetailDto, type TeamMemberDto, type TeamPageDto, type TeamQuery } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { NotFoundError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { CareerCompetencyService } from './career-competency.service';
import { CareerContentRepository } from '../../domain/contracts/career-content.repository';
import { CareerLearningRepository } from '../../domain/contracts/career-learning.repository';
import { CareerTeamPort, type TeamPerson } from '../../domain/contracts/career-team.port';
import { TitleIdentityPort } from '../../domain/contracts/title-identity.port';
import { findUnit } from '../../domain/rules/learning-proof.rules';
import { teamNumbers } from '../../domain/rules/team.rules';
import type { LearningRecordRow, StoredCareerContent } from '../../domain/types/career-profile.types';

/** «My career team»: the numbers of the people the viewer's scope reaches (FR-115). Read only. */
@Injectable()
export class CareerTeamService {
  constructor(
    private readonly team: CareerTeamPort,
    private readonly content: CareerContentRepository,
    private readonly records: CareerLearningRepository,
    private readonly titles: TitleIdentityPort,
    private readonly competencies: CareerCompetencyService,
    private readonly clock: Clock,
  ) {}

  async list(ctx: AccessContext, query: TeamQuery): Promise<TeamPageDto> {
    const people = await this.team.members(this.scope(ctx), query.search);
    // A person whose title has no published path has nothing to follow: they are not part of this list (nor of its counts).
    const all = (await this.rows(ctx, people)).filter((m) => m.status !== 'no_path');
    const shown = query.status ? all.filter((m) => m.status === query.status) : all;
    const start = (query.page - 1) * query.pageSize;
    return { items: shown.slice(start, start + query.pageSize), total: shown.length, page: query.page, pageSize: query.pageSize, lateCount: all.filter((m) => m.status === 'late').length };
  }

  /** One member with the proofs waiting for a decision; a person the scope does not reach is a 404. */
  async member(ctx: AccessContext, employeeId: string): Promise<TeamMemberDetailDto> {
    const person = await this.team.member(this.scope(ctx), employeeId);
    if (!person) throw new NotFoundError('Employee', employeeId);
    const [row] = await this.rows(ctx, [person]);
    const records = (await this.records.forEmployees([employeeId])).filter((r) => r.status === 'wait' || r.status === 'referred');
    const stored = person.titleId ? await this.content.find(person.titleId) : null;
    const competencies = stored?.status === 'ready' ? await this.competencies.statuses(employeeId, stored.content) : [];
    return { ...(row as TeamMemberDto), competencies, proofs: records.map((r) => ({ id: r.id, unitTitle: this.unitTitle(stored, r), kind: r.proofKind, status: r.status, submittedAt: r.submittedAt.toISOString(), note: r.note })) };
  }

  private unitTitle(stored: StoredCareerContent | null, record: LearningRecordRow): string {
    return (stored && findUnit(stored.content, record.unitId)?.title) || '';
  }

  private scope(ctx: AccessContext) {
    const filter = ctx.filterFor(CorePermission.CareerTeamView);
    if (!filter) throw new NotFoundError('Team');
    return filter;
  }

  private async rows(ctx: AccessContext, people: TeamPerson[]): Promise<TeamMemberDto[]> {
    const withContact = !!ctx.filterFor(CorePermission.DirectoryView);
    const ids = people.map((p) => p.employeeId);
    const [records, ticks] = await Promise.all([this.records.forEmployees(ids), this.records.requiredDoneFor(ids)]);
    const today = riyadhToday(this.clock.now());
    const out: TeamMemberDto[] = [];
    for (const person of people) out.push(await this.row(person, { records: records.filter((r) => r.employeeId === person.employeeId), ticks: ticks.filter((t) => t.employeeId === person.employeeId && t.titleId === person.titleId).map((t) => t.index), today }, withContact));
    return out;
  }

  private async row(person: TeamPerson, data: { records: LearningRecordRow[]; ticks: number[]; today: string }, withContact: boolean): Promise<TeamMemberDto> {
    const base = { employeeId: person.employeeId, name: person.name, contact: withContact ? person.contact : null };
    const stored = person.titleId ? await this.content.find(person.titleId) : null;
    if (!person.titleId || stored?.status !== 'ready') return { ...base, titleNameAr: null, titleNameEn: null, requiredDone: 0, requiredTotal: 0, approvedMinutes: 0, yearMinutes: null, overdue: 0, waiting: 0, status: 'no_path' };
    const title = await this.titles.identity(person.titleId);
    const numbers = teamNumbers({ content: stored.content, records: data.records, ticked: data.ticks, today: data.today });
    return { ...base, titleNameAr: title.nameAr, titleNameEn: title.nameEn, yearMinutes: title.stage ? title.stage.hoursPerYear * 60 : null, ...numbers };
  }
}
