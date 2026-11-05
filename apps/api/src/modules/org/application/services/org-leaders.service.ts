import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  EndLeaderInput,
  LeaderEscalationDto,
  ManagementMode,
  OrgNodeLeadersDto,
  OrgTreeLeaderDto,
  SetLeaderInput,
} from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { dayBefore } from '../../../../common/domain/dates';
import { todayInRiyadh } from '../../../../common/domain/riyadh-date';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { ORG_CHANGED } from '../../../../core/access/application/access.events';
import { UserAccessService } from '../../../../core/access/application/user-access.service';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { EmployeePlacementPort } from '../../domain/contracts/employee-placement.port';
import { OrgLeaderRepository } from '../../domain/contracts/org-leader.repository';
import { OrgRepository } from '../../domain/contracts/org.repository';
import { GroupCompanyMissingError, OrgLeaderEmployeeError, OrgLeaderEndError, OrgLeaderNotPendingError } from '../../domain/errors/org.errors';
import { assertActing, assertLeaderCompany, escalateLeader, isActiveLeader, planLeader, type LeaderChainUnit } from '../../domain/rules/org-leader.rules';
import { effectiveModes } from '../../domain/rules/org-visibility.rules';
import type { LeaderRow } from '../../domain/types/org-leader.types';
import type { NodeView } from '../../domain/types/org.types';
import { ORG_AUDIT } from '../messages/org.messages';
import { assertCompanyAccess, ORG_LEADERS_MANAGE } from '../policies/org-access.policy';
import { companyRows, toLeaderDto } from '../transformers/org-leader.transformer';
import { OrgVisibilityService } from './org-visibility.service';

/** A leader row of a unit. */
export interface LeaderTarget {
  nodeId: string;
  leaderId: string;
}

/** The group company's leader is the unit's primary one (its current copy on the unit); else the one who started first. */
export function primaryLeader(rows: readonly LeaderRow[], groupCompanyId: string, today: string): LeaderRow | null {
  const active = rows.filter((r) => r.kind === 'leader' && isActiveLeader(r, today));
  const ordered = [...active].sort((a, b) => Number(b.companyId === groupCompanyId) - Number(a.companyId === groupCompanyId) || a.validFrom.localeCompare(b.validFrom) || a.id.localeCompare(b.id));
  return ordered[0] ?? null;
}

/**
 * Leaders of a unit per company and acting leaders (FR-100). The head role of the unit (one per unit, not per company) goes to every leader and
 * acting leader in force; `org_nodes.manager_id` keeps the primary leader as a copy.
 */
@Injectable()
export class OrgLeadersService {
  private readonly logger = new Logger(OrgLeadersService.name);

  constructor(
    private readonly repo: OrgRepository,
    private readonly leaders: OrgLeaderRepository,
    private readonly employees: EmployeePlacementPort,
    private readonly visibility: OrgVisibilityService,
    private readonly access: UserAccessService,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  async list(ctx: AccessContext, nodeId: string): Promise<OrgNodeLeadersDto> {
    await this.visibility.assertVisible(ctx, nodeId);
    return this.describe(await this.mustNode(nodeId));
  }

  async set(ctx: AccessContext, nodeId: string, input: SetLeaderInput, actorId: string): Promise<OrgNodeLeadersDto> {
    const node = await this.mustNode(nodeId);
    assertCompanyAccess(ctx, ORG_LEADERS_MANAGE, node.companyId);
    await this.assertPerson(node, input);
    const before = await this.leaders.employeesOf(nodeId);
    await this.tx.run(async (tx) => {
      await this.leaders.lock(nodeId, tx);
      await this.write(node, input, actorId, tx);
      await this.refreshCopy(node, tx);
    });
    this.audit(actorId, ORG_AUDIT.unitLeaderSet, nodeId, { companyId: input.companyId, employeeId: input.employeeId, kind: input.kind, validFrom: input.validFrom, validTo: input.validTo ?? null, reason: input.reason });
    await this.changed(nodeId, ...before, ...(node.managerId ? [node.managerId] : []));
    return this.describe(node);
  }

  /** Ends a leader in force on `endDate` (the last day): today, or a later day. */
  async end(ctx: AccessContext, target: LeaderTarget, input: EndLeaderInput, actorId: string): Promise<OrgNodeLeadersDto> {
    const { nodeId, leaderId } = target;
    const node = await this.mustNode(nodeId);
    assertCompanyAccess(ctx, ORG_LEADERS_MANAGE, node.companyId);
    const row = await this.mustRow(nodeId, leaderId);
    const today = todayInRiyadh();
    if (input.endDate < today || input.endDate < row.validFrom || (row.validTo !== null && row.validTo < today)) throw new OrgLeaderEndError();
    await this.tx.run(async (tx) => {
      await this.leaders.lock(nodeId, tx);
      await this.leaders.close(row.id, input.endDate, tx);
      await this.refreshCopy(node, tx);
    });
    this.audit(actorId, ORG_AUDIT.unitLeaderEnded, nodeId, { leaderId, employeeId: row.employeeId, endDate: input.endDate, reason: input.reason });
    await this.changed(nodeId, row.employeeId);
    return this.describe(node);
  }

  /** Removes a leader that has not started yet; the leader it was to replace takes the days back. */
  async remove(ctx: AccessContext, target: LeaderTarget, actorId: string): Promise<OrgNodeLeadersDto> {
    const { nodeId, leaderId } = target;
    const node = await this.mustNode(nodeId);
    assertCompanyAccess(ctx, ORG_LEADERS_MANAGE, node.companyId);
    const row = await this.mustRow(nodeId, leaderId);
    if (row.validFrom <= todayInRiyadh()) throw new OrgLeaderNotPendingError();
    await this.tx.run(async (tx) => {
      await this.leaders.lock(nodeId, tx);
      await this.leaders.remove(row.id, tx);
      await this.reopenPrevious(row, tx);
    });
    this.audit(actorId, ORG_AUDIT.unitLeaderRemoved, nodeId, { leaderId, employeeId: row.employeeId, validFrom: row.validFrom });
    await this.changed(nodeId, row.employeeId);
    return this.describe(node);
  }

  /** The leaders and acting leaders in force today, by unit (the tree shows them). */
  async currentByNode(today: string = todayInRiyadh()): Promise<Map<string, OrgTreeLeaderDto[]>> {
    const rows = await this.leaders.activeRows(today);
    const names = await this.employees.namesOf([...new Set(rows.map((r) => r.employeeId))]);
    const byNode = new Map<string, OrgTreeLeaderDto[]>();
    for (const r of rows) byNode.set(r.nodeId, [...(byNode.get(r.nodeId) ?? []), { employeeId: r.employeeId, name: names.get(r.employeeId) ?? '', kind: r.kind, companyId: r.companyId }]);
    return byNode;
  }

  /**
   * The nightly pass: a leader whose day came (or ended) moves the unit's current copy and the head role. Returns the units whose copy changed.
   * Idempotent: a second run changes nothing.
   */
  async refreshCurrentCopies(): Promise<number> {
    let changed = 0;
    for (const nodeId of await this.leaders.nodesWithRows()) {
      try {
        const node = await this.repo.node(nodeId);
        if (!node) continue;
        if (await this.tx.run((tx) => this.refreshCopy(node, tx))) changed += 1;
        await this.syncHeadRoles(node.id);
      } catch (error) {
        // One unit with bad data must not leave the units after it with a stale manager and stale head roles.
        this.logger.error(`Leaders of unit ${nodeId} could not be refreshed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return changed;
  }

  /** The head role of the unit follows its leaders: given to each leader and acting leader in force, taken back from the rest. */
  async syncHeadRoles(nodeId: string, ...also: string[]): Promise<void> {
    const node = await this.repo.node(nodeId);
    const people = new Set([...(await this.leaders.employeesOf(nodeId)), ...also, ...(node?.managerId ? [node.managerId] : [])]);
    for (const employeeId of people) await this.access.syncHeadRole(nodeId, employeeId);
  }

  // ------------------------------------------------------------------ helpers
  private async assertPerson(node: NodeView, input: SetLeaderInput): Promise<void> {
    const mode: ManagementMode = (await this.repo.effectiveModesOf([node.id])).get(node.id) ?? 'per_company';
    assertLeaderCompany(mode, input.companyId, await this.groupCompanyId());
    if (!(await this.repo.company(input.companyId))) throw new NotFoundError('Company', input.companyId);
    if (!(await this.employees.exists(input.employeeId, input.companyId))) throw new OrgLeaderEmployeeError();
  }

  private async write(node: NodeView, input: SetLeaderInput, actorId: string, tx: TransactionContext): Promise<void> {
    const rows = (await this.leaders.rowsOf(node.id, tx)).filter((r) => r.companyId === input.companyId);
    const request = { kind: input.kind, employeeId: input.employeeId, validFrom: input.validFrom, validTo: input.validTo ?? null };
    const today = todayInRiyadh();
    if (input.kind === 'acting') assertActing(rows, request, today);
    else await this.supersede(planLeader(rows, request, today), tx);
    await this.leaders.insert({ nodeId: node.id, companyId: input.companyId, ...request, reason: input.reason, createdBy: actorId }, tx);
  }

  private async supersede(plan: ReturnType<typeof planLeader>, tx: TransactionContext): Promise<void> {
    for (const id of plan.replaceIds) await this.leaders.remove(id, tx);
    for (const row of plan.close) await this.leaders.close(row.id, row.validTo, tx);
  }

  /** Removing a leader that waited gives the days back to the leader that was closed the day before it. */
  private async reopenPrevious(removed: LeaderRow, tx: TransactionContext): Promise<void> {
    if (removed.kind !== 'leader') return;
    const rows = await this.leaders.rowsOf(removed.nodeId, tx);
    const before = rows.find((r) => r.kind === 'leader' && r.companyId === removed.companyId && r.validTo === dayBefore(removed.validFrom));
    if (before) await this.leaders.close(before.id, removed.validTo, tx);
  }

  /** Keeps `org_nodes.manager_id` as the primary leader in force; a unit with no leader row keeps the manager it was given directly. Returns whether it changed. */
  private async refreshCopy(node: NodeView, tx: TransactionContext): Promise<boolean> {
    const rows = await this.leaders.rowsOf(node.id, tx);
    if (!rows.length) return false;
    const primary = primaryLeader(rows, await this.groupCompanyId(), todayInRiyadh());
    const current = (await this.repo.node(node.id))?.managerId ?? null;
    if ((primary?.employeeId ?? null) === current) return false;
    await this.leaders.setNodeManager(node.id, primary?.employeeId ?? null, tx);
    return true;
  }

  /** The head roles follow, and the rest of the platform learns the structure changed. */
  private async changed(nodeId: string, ...also: string[]): Promise<void> {
    await this.syncHeadRoles(nodeId, ...also);
    await this.events.emitAsync(ORG_CHANGED);
  }

  private async describe(node: NodeView): Promise<OrgNodeLeadersDto> {
    const today = todayInRiyadh();
    const [rows, nodes, companies, staff, groupCompanyId] = await Promise.all([
      this.leaders.rowsOf(node.id),
      this.repo.nodes(),
      this.repo.companies(),
      this.employees.staffByUnitAndCompany(),
      this.groupCompanyId(),
    ]);
    const modes = effectiveModes(nodes.map((n) => ({ id: n.id, parentId: n.parentId, mode: n.managementMode })));
    const mode = modes.get(node.id) ?? 'per_company';
    const names = { companies: new Map(companies.map((c) => [c.id, c])), employees: await this.employees.namesOf([...new Set(rows.map((r) => r.employeeId))]) };
    const items = rows.map((r) => toLeaderDto(r, names, today));
    const staffHere = staff.get(node.id) ?? new Map<string, number>();
    const companyIds = new Set<string>([...staffHere.keys(), ...rows.map((r) => r.companyId), ...(mode === 'shared' ? [groupCompanyId] : [])]);
    const escalation = await this.escalations(nodes, modes, { today, groupCompanyId });
    return { nodeId: node.id, effectiveMode: mode, groupCompanyId, items, companies: companyRows({ nodeId: node.id, companyIds, companies: names.companies, items, staff: staffHere, escalation }) };
  }

  /** `(unit, company)` → where the manager goes when the company has no leader in the unit; names are filled for the units and people found. */
  private async escalations(nodes: NodeView[], modes: Map<string, ManagementMode>, when: { today: string; groupCompanyId: string }): Promise<(nodeId: string, company: string) => LeaderEscalationDto | null> {
    const active = await this.leaders.activeRows(when.today);
    const units = new Map<string, LeaderChainUnit>(nodes.map((n) => [n.id, { nodeId: n.id, parentId: n.parentId, shared: modes.get(n.id) === 'shared', leaders: new Map(active.filter((r) => r.nodeId === n.id && r.kind === 'leader').map((r) => [r.companyId, r.employeeId])) }]));
    const names = await this.employees.namesOf([...new Set(active.map((r) => r.employeeId))]);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return (nodeId, company) => {
      const found = escalateLeader(units, nodeId, company, when.groupCompanyId);
      const unit = found ? byId.get(found.nodeId) : undefined;
      return found && unit ? { nodeId: unit.id, nodeNameAr: unit.nameAr, nodeNameEn: unit.nameEn, employeeId: found.employeeId, employeeName: names.get(found.employeeId) ?? '' } : null;
    };
  }

  private async groupCompanyId(): Promise<string> {
    const id = await this.repo.groupCompanyId();
    if (!id) throw new GroupCompanyMissingError();
    return id;
  }

  private async mustNode(id: string): Promise<NodeView> {
    const node = await this.repo.node(id);
    if (!node) throw new NotFoundError('Unit', id);
    return node;
  }

  private async mustRow(nodeId: string, leaderId: string): Promise<LeaderRow> {
    const row = await this.leaders.byId(leaderId);
    if (!row || row.nodeId !== nodeId) throw new NotFoundError('Leader', leaderId);
    return row;
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'org', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
