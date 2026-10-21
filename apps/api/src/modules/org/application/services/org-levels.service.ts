import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  CopyOrgLevelsInput,
  EmployeesDecision,
  OrgImpactDto,
  OrgLevelDto,
  OrgLevelsPreviewDto,
  PreviewOrgLevelsInput,
  SaveOrgLevelsInput,
} from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { EmployeePlacementPort } from '../../domain/contracts/employee-placement.port';
import {
  EmployeesDecisionRequiredError,
  InvalidEmployeesDecisionError,
  OrgImpactChangedError,
  OrgImpactConfirmationRequiredError,
  OrgLevelsNotEmptyError,
} from '../../domain/errors/org.errors';
import { planLevels, type LevelsPlan } from '../../domain/rules/org-levels.rules';
import type { TitleView } from '../../domain/types/org.types';
import { OrgRepository } from '../../domain/contracts/org.repository';
import { toLevelDto } from '../transformers/org.transformer';
import { ORG_AUDIT } from '../messages/org.messages';

const MAX_LISTED_UNITS = 50;

interface Analysis {
  companyId: string;
  plan: LevelsPlan;
  removedNodeIds: string[];
  unassignedNodeIds: string[];
  titles: TitleView[];
  employeesByTitle: Map<string, number>;
  employeesTotal: number;
  impact: OrgImpactDto | null;
}

@Injectable()
export class OrgLevelsService {
  constructor(
    private readonly repo: OrgRepository,
    private readonly employees: EmployeePlacementPort,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  async list(companyId: string): Promise<OrgLevelDto[]> {
    await this.assertCompany(companyId);
    const [levels, counts] = await Promise.all([this.repo.levels(companyId), this.repo.unitCountsByLevel(companyId)]);
    return levels.map((l) => toLevelDto(l, counts.get(l.id) ?? 0));
  }

  /** Copies the default template into a new company (same transaction as the company). */
  async applyTemplate(companyId: string, tx: TransactionContext): Promise<void> {
    const template = await this.repo.templateLevels();
    await this.repo.applyLevels(companyId, { removeIds: [], items: template }, tx);
  }

  async preview(input: PreviewOrgLevelsInput): Promise<OrgLevelsPreviewDto> {
    await this.assertCompany(input.companyId);
    const analysis = await this.analyze(input.companyId, input.levels);
    return { requiresConfirmation: analysis.impact !== null, impact: analysis.impact };
  }

  async save(input: SaveOrgLevelsInput, actorId: string): Promise<OrgLevelDto[]> {
    await this.assertCompany(input.companyId);
    const analysis = await this.analyze(input.companyId, input.levels);
    if (analysis.impact) this.assertConfirmed(analysis, input.confirm);
    await this.tx.run(async (tx) => {
      if (analysis.impact) await this.applyImpact(analysis, input.confirm?.employees, actorId, tx);
      await this.repo.applyLevels(input.companyId, { removeIds: analysis.plan.removeIds, items: analysis.plan.items }, tx);
    });
    this.audit(actorId, ORG_AUDIT.levelsChanged, input.companyId, {
      levels: analysis.plan.items.length,
      unitsRemoved: analysis.removedNodeIds.length,
      jobTitlesRemoved: analysis.titles.length,
      employeesAffected: analysis.employeesTotal,
      employeesAction: input.confirm?.employees?.action ?? null,
    });
    return this.list(input.companyId);
  }

  /** Copies another company's levels. Only for a company without units; otherwise use the levels form. */
  async copy(input: CopyOrgLevelsInput, actorId: string): Promise<OrgLevelDto[]> {
    await Promise.all([this.assertCompany(input.fromCompanyId), this.assertCompany(input.toCompanyId)]);
    if ((await this.repo.unitsCountOfCompany(input.toCompanyId)) > 0) throw new OrgLevelsNotEmptyError();
    const [source, target] = await Promise.all([this.repo.levels(input.fromCompanyId), this.repo.levels(input.toCompanyId)]);
    const items = source.map((l) => ({ nameAr: l.nameAr, nameEn: l.nameEn, isAssignable: l.isAssignable, sortOrder: l.sortOrder }));
    await this.tx.run((tx) => this.repo.applyLevels(input.toCompanyId, { removeIds: target.map((l) => l.id), items }, tx));
    this.audit(actorId, ORG_AUDIT.levelsCopied, input.toCompanyId, { fromCompanyId: input.fromCompanyId });
    return this.list(input.toCompanyId);
  }

  private async assertCompany(companyId: string): Promise<void> {
    if (!(await this.repo.company(companyId))) throw new NotFoundError('Company', companyId);
  }

  /** Works out what the requested levels would remove or detach, without changing anything. */
  private async analyze(companyId: string, input: PreviewOrgLevelsInput['levels']): Promise<Analysis> {
    const plan = planLevels(await this.repo.levels(companyId), input);
    const affected = await this.repo.nodesOfLevels(plan.affectedLevelIds);
    const removedNodeIds = await this.repo.descendantIds(affected.map((n) => n.id));
    const removed = new Set(removedNodeIds);
    const unassignedNodeIds = (await this.repo.nodesOfLevels(plan.unassignedLevelIds)).map((n) => n.id).filter((id) => !removed.has(id));
    const titles = await this.repo.titlesOfNodes([...removedNodeIds, ...unassignedNodeIds]);
    const employeesByTitle = await this.employees.countByTitles(titles.map((t) => t.id));
    const byNode = await this.employees.countByNodes([...removedNodeIds, ...unassignedNodeIds]);
    const employeesTotal = [...byNode.values()].reduce((sum, n) => sum + n, 0);
    const base = { companyId, plan, removedNodeIds, unassignedNodeIds, titles, employeesByTitle, employeesTotal };
    const hasData = removedNodeIds.length > 0 || titles.length > 0 || employeesTotal > 0;
    return { ...base, impact: hasData ? await this.describeImpact(base) : null };
  }

  private async describeImpact(a: Omit<Analysis, 'impact'>): Promise<OrgImpactDto> {
    const paths = await this.repo.pathsOf(a.removedNodeIds.slice(0, MAX_LISTED_UNITS));
    return {
      unitsCount: a.removedNodeIds.length,
      jobTitlesCount: a.titles.length,
      employeesCount: a.employeesTotal,
      titlesWithEmployees: a.titles
        .filter((t) => (a.employeesByTitle.get(t.id) ?? 0) > 0)
        .map((t) => ({ id: t.id, nameAr: t.nameAr, nameEn: t.nameEn, employeesCount: a.employeesByTitle.get(t.id) ?? 0 })),
      units: [...paths].map(([id, p]) => ({ id, pathAr: p.pathAr, pathEn: p.pathEn })),
      impactToken: impactToken(a),
    };
  }

  private assertConfirmed(a: Analysis, confirm: SaveOrgLevelsInput['confirm']): void {
    const impact = a.impact as OrgImpactDto;
    if (!confirm) throw new OrgImpactConfirmationRequiredError(impact);
    if (confirm.impactToken !== impact.impactToken) throw new OrgImpactChangedError(impact);
    if (a.employeesTotal > 0 && !confirm.employees) throw new EmployeesDecisionRequiredError();
  }

  private async applyImpact(a: Analysis, decision: EmployeesDecision | undefined, actorId: string, tx: TransactionContext): Promise<void> {
    const fromNodeIds = [...a.removedNodeIds, ...a.unassignedNodeIds];
    if (a.employeesTotal > 0 && decision) await this.moveOrRemoveEmployees({ a, decision, fromNodeIds, actorId }, tx);
    await this.repo.softDeleteTitles(a.titles.map((t) => t.id), tx);
    await this.repo.softDeleteNodes(a.removedNodeIds, tx);
  }

  private async moveOrRemoveEmployees(
    ctx: { a: Analysis; decision: EmployeesDecision; fromNodeIds: string[]; actorId: string },
    tx: TransactionContext,
  ): Promise<void> {
    const { a, decision, fromNodeIds, actorId } = ctx;
    if (decision.action === 'delete') {
      if (decision.confirmCount !== a.employeesTotal) throw new InvalidEmployeesDecisionError('confirmCount must equal the number of affected employees');
      await this.employees.remove({ fromNodeIds, actorId }, tx);
      return;
    }
    const fallbackTitleId = await this.assertTransferTarget(a, decision);
    await this.employees.transfer({ fromNodeIds, targetNodeId: decision.unitId, titleMap: decision.titleMap, fallbackTitleId }, tx);
  }

  /** The target must survive the change, accept employees, and every job title in use must map to one of its titles. */
  private async assertTransferTarget(a: Analysis, decision: Extract<EmployeesDecision, { action: 'transfer' }>): Promise<string> {
    const target = await this.repo.node(decision.unitId);
    const survivingAssignable = new Set(a.plan.items.filter((l) => l.id && l.isAssignable && !a.plan.affectedLevelIds.includes(l.id)).map((l) => l.id));
    const doomed = new Set([...a.removedNodeIds, ...a.unassignedNodeIds]);
    if (!target || target.companyId !== a.companyId || doomed.has(target.id) || !survivingAssignable.has(target.levelId)) {
      throw new InvalidEmployeesDecisionError('The target unit must stay in the structure and accept employees');
    }
    const targetTitles = (await this.repo.titlesOfNodes([target.id])).filter((t) => t.isActive);
    const allowed = new Set(targetTitles.map((t) => t.id));
    const unmapped = [...a.employeesByTitle].filter(([id, count]) => count > 0 && !allowed.has(decision.titleMap[id] ?? ''));
    if (!allowed.size || unmapped.length) throw new InvalidEmployeesDecisionError('Map every affected job title to a job title of the target unit');
    return targetTitles[0]?.id as string;
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'company', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}

function impactToken(a: Omit<Analysis, 'impact'>): string {
  const payload = {
    company: a.companyId,
    removed: [...a.removedNodeIds].sort(),
    unassigned: [...a.unassignedNodeIds].sort(),
    titles: a.titles.map((t) => t.id).sort(),
    employees: a.employeesTotal,
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 40);
}
