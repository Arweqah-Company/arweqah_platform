import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ROOT_PARENT, type OrgLevelsDto, type SaveOrgLevelRulesInput, type SaveOrgLevelsInput } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { ORG_CHANGED } from '../../../../core/access/application/access.events';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { OrgLevelInUseError } from '../../domain/errors/org.errors';
import { assertValidRules, planLevels } from '../../domain/rules/org-level-plan.rules';
import { OrgRepository } from '../../domain/contracts/org.repository';
import { toLevelDto } from '../transformers/org.transformer';
import { ORG_AUDIT } from '../messages/org.messages';

/** The unit types of the whole group and the «who may be created under whom» table. */
@Injectable()
export class OrgLevelsService {
  constructor(
    private readonly repo: OrgRepository,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
  ) {}

  async list(): Promise<OrgLevelsDto> {
    const [levels, counts, rules] = await Promise.all([this.repo.levels(), this.repo.unitCountsByLevel(), this.repo.levelRules()]);
    const table: Record<string, string[]> = { [ROOT_PARENT]: [], ...Object.fromEntries(levels.map((l) => [l.key, [] as string[]])) };
    for (const [parent, children] of Object.entries(rules)) table[parent] = [...children];
    return { levels: levels.map((l) => toLevelDto(l, counts.get(l.id) ?? 0)), rules: table };
  }

  /** Renames types, sets which accept titles, adds types and removes added types that no unit uses. */
  async save(input: SaveOrgLevelsInput, actorId: string): Promise<OrgLevelsDto> {
    const [existing, counts] = await Promise.all([this.repo.levels(), this.repo.unitCountsByLevel()]);
    const plan = planLevels(existing, input.levels);
    if (plan.removeIds.some((id) => (counts.get(id) ?? 0) > 0)) throw new OrgLevelInUseError();
    await this.tx.run((tx) => this.repo.applyLevels({ removeIds: plan.removeIds, items: plan.items.map((i) => ({ ...i, isAssignable: i.acceptsTitles })) }, tx));
    this.audit(actorId, ORG_AUDIT.levelsChanged, { types: plan.items.length, added: plan.items.filter((i) => !i.id).length, removed: plan.removeIds.length });
    await this.events.emitAsync(ORG_CHANGED);
    return this.list();
  }

  /** Replaces the whole table. It only stops new units: units that already exist are neither moved nor removed. */
  async saveRules(input: SaveOrgLevelRulesInput, actorId: string): Promise<OrgLevelsDto> {
    const keys = new Set((await this.repo.levels()).map((l) => l.key));
    assertValidRules(input.rules, keys);
    await this.tx.run((tx) => this.repo.replaceLevelRules(input.rules, tx));
    this.audit(actorId, ORG_AUDIT.levelRulesChanged, { pairs: Object.values(input.rules).reduce((n, c) => n + c.length, 0) });
    return this.list();
  }

  private audit(actorId: string, action: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'org', entityId: 'levels', changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
