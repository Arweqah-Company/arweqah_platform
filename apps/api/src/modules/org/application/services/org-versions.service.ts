import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { OrgNodeVersionDto, OrgNodeVersionsDto, UpdateCharterInput } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { todayInRiyadh } from '../../../../common/domain/riyadh-date';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { ACCESS_CHANGED, ORG_CHANGED } from '../../../../core/access/application/access.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { AuditService } from '../../../../core/audit/application/audit.service';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { EmployeePlacementPort } from '../../domain/contracts/employee-placement.port';
import { OrgVersionRepository } from '../../domain/contracts/org-version.repository';
import { OrgRepository } from '../../domain/contracts/org.repository';
import { planVersion } from '../../domain/rules/org-version.rules';
import type { UnitValues, VersionView } from '../../domain/types/org-version.types';
import type { NodeView } from '../../domain/types/org.types';
import { ORG_AUDIT } from '../messages/org.messages';
import { assertCompanyAccess, ORG_CHARTER_EDIT } from '../policies/org-access.policy';
import { nodeAsVersionDto, toLogLineDto, toVersionDto } from '../transformers/org-version.transformer';
import { OrgLeadersService } from './org-leaders.service';
import { OrgVisibilityService } from './org-visibility.service';

/** From which day, why, and by whom a unit's values change. */
export interface DatedChange {
  effectiveFrom: string;
  reason: string;
  actorId: string | null;
}

const BASELINE_REASON = 'The unit as it was before dated versions';
const LOG_SIZE = 50;

/**
 * Dated versions of a unit (FR-99): its name, switch and charter, each version with the days it holds and the reason. The unit keeps the version in
 * force as its current values; a version that starts later waits until the nightly job applies it. The day before today is never rewritten.
 */
@Injectable()
export class OrgVersionsService {
  private readonly logger = new Logger(OrgVersionsService.name);

  constructor(
    private readonly repo: OrgRepository,
    private readonly versions: OrgVersionRepository,
    private readonly employees: EmployeePlacementPort,
    private readonly visibility: OrgVisibilityService,
    private readonly leaders: OrgLeadersService,
    private readonly audit: AuditService,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  async get(ctx: AccessContext, nodeId: string): Promise<OrgNodeVersionsDto> {
    await this.visibility.assertVisible(ctx, nodeId);
    return this.describe(await this.mustNode(nodeId));
  }

  async updateCharter(ctx: AccessContext, nodeId: string, input: UpdateCharterInput, actorId: string): Promise<OrgNodeVersionsDto> {
    const node = await this.mustNode(nodeId);
    assertCompanyAccess(ctx, ORG_CHARTER_EDIT, node.companyId);
    const { effectiveFrom = todayInRiyadh(), reason, ...charter } = input;
    const applied = await this.tx.run((tx) => this.record(node, { charter }, { effectiveFrom, reason, actorId }, tx));
    this.events.emit(AUDIT_EVENT, { actorId, action: ORG_AUDIT.unitCharterChanged, entityType: 'org', entityId: nodeId, changes: { effectiveFrom, reason, applied } } satisfies AuditEvent);
    if (applied) await this.events.emitAsync(ORG_CHANGED);
    return this.describe(await this.mustNode(nodeId));
  }

  /**
   * Writes a version of the unit with the changed values on top of its last version, from `effectiveFrom`; a change that starts today is copied onto the
   * unit at once. Runs inside the caller's transaction. Returns whether the unit changed now (false = scheduled).
   */
  async record(node: NodeView, change: Partial<UnitValues>, when: DatedChange, tx: TransactionContext): Promise<boolean> {
    await this.versions.lockNode(node.id, tx);
    const today = todayInRiyadh();
    const stored = await this.versions.versionsOf(node.id, tx);
    const periods = stored.length ? stored : await this.baseline(node, today, tx);
    const plan = planVersion(periods, when.effectiveFrom, today);
    const last = periods[periods.length - 1] as VersionView;
    const values: UnitValues = {
      nameAr: change.nameAr ?? last.nameAr,
      nameEn: change.nameEn ?? last.nameEn,
      isActive: change.isActive ?? last.isActive,
      charter: change.charter === undefined ? last.charter : change.charter,
    };
    const stamp = { reason: when.reason, createdBy: when.actorId, appliedAt: plan.applyNow ? new Date() : null };
    if (plan.closeId) await this.versions.close(plan.closeId, plan.closeTo, tx);
    if (plan.replaceId) await this.versions.overwrite(plan.replaceId, { ...values, ...stamp }, tx);
    else await this.versions.insert({ nodeId: node.id, validFrom: when.effectiveFrom, validTo: null, code: node.code, ...values, ...stamp }, tx);
    if (plan.applyNow) await this.versions.applyToNode(node.id, values, tx);
    return plan.applyNow;
  }

  /** Starts the history of a unit that has none: its own values from the day it started (or today when it starts later). */
  private async baseline(node: NodeView, today: string, tx: TransactionContext): Promise<VersionView[]> {
    await this.versions.insert(
      { nodeId: node.id, validFrom: node.startDate < today ? node.startDate : today, validTo: null, code: node.code, nameAr: node.nameAr, nameEn: node.nameEn, isActive: node.isActive, charter: node.charter, reason: BASELINE_REASON, createdBy: null, appliedAt: new Date() },
      tx,
    );
    return this.versions.versionsOf(node.id, tx);
  }

  /** The nightly pass: versions whose day has come are copied onto their units. Idempotent; a failing unit does not stop the others. */
  async applyDue(today: string = todayInRiyadh()): Promise<number> {
    let applied = 0;
    for (const version of await this.versions.due(today)) {
      try {
        await this.applyOne(version);
        applied += 1;
      } catch (error) {
        this.logger.error(`Version ${version.id} of unit ${version.nodeId} could not be applied: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (applied) {
      this.logger.log(`Applied ${applied} dated change(s) of units`);
      await this.events.emitAsync(ORG_CHANGED);
      this.events.emit(ACCESS_CHANGED, {});
    }
    return applied;
  }

  private async applyOne(version: VersionView): Promise<void> {
    await this.tx.run(async (tx) => {
      await this.versions.applyToNode(version.nodeId, version, tx);
      await this.versions.markApplied(version.id, new Date(), tx);
    });
    this.events.emit(AUDIT_EVENT, { actorId: null, action: ORG_AUDIT.unitVersionApplied, entityType: 'org', entityId: version.nodeId, changes: { validFrom: version.validFrom, reason: version.reason } } satisfies AuditEvent);
    await this.leaders.syncHeadRoles(version.nodeId);
  }

  private async describe(node: NodeView): Promise<OrgNodeVersionsDto> {
    const today = todayInRiyadh();
    const [stored, log] = await Promise.all([this.versions.versionsOf(node.id), this.audit.search({ page: 1, pageSize: LOG_SIZE, entityType: 'org', entityId: node.id })]);
    const names = await this.employees.userNamesOf([...new Set(stored.flatMap((v) => (v.createdBy ? [v.createdBy] : [])))]);
    const dtos: OrgNodeVersionDto[] = stored.length ? stored.map((v) => toVersionDto(v, today, v.createdBy ? (names.get(v.createdBy) ?? null) : null)) : [nodeAsVersionDto(node, today)];
    return { nodeId: node.id, charter: node.charter, versions: dtos.sort((a, b) => b.validFrom.localeCompare(a.validFrom)), log: log.items.map(toLogLineDto) };
  }

  private async mustNode(id: string): Promise<NodeView> {
    const node = await this.repo.node(id);
    if (!node) throw new NotFoundError('Unit', id);
    return node;
  }
}
