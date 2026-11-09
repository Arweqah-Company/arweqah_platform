import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PROVIDERS_OF,
  isProviderOf,
  providerProblems,
  type IntegrationCatalogDto,
  type IntegrationKind,
  type ProviderDto,
  type ProviderKey,
  type ProviderValues,
  type SaveProviderInput,
  type TestProviderInput,
  type TestResultDto,
} from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { withTimeout } from '../../../../common/application/with-timeout';
import { RateWindow } from '../../../../common/application/rate-window';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AppConfig } from '../../../../config/app-config.service';
import { AUDIT_EVENT, type AuditEvent } from '../../../audit/application/audit.events';
import { IntegrationProviderRepository } from '../../domain/contracts/integration-provider.repository';
import type { IntegrationProvider } from '../../domain/entities/integration-provider.entity';
import { ProviderIncompleteError, ProviderNotTestedError, ProviderTestRateLimitedError } from '../../domain/errors/integrations.errors';
import { changedFields, mergeValues, redactSecrets } from '../../domain/rules/provider-config.rules';
import { AUDIT, TESTS_PER_MINUTE, TEST_TIMEOUT_MS, TEST_WINDOW_MS } from '../messages/integrations.messages';
import { toProviderDto } from '../transformers/provider.transformer';
import { ActiveProviders } from './active-providers.service';
import { ProbeRegistry } from './probe-registry';
import { ProviderConfigCodec } from './provider-config.codec';

/**
 * The dashboard's side of translation and e-mail providers: save the data, try it, switch one on.
 * A provider is switched on only when its data is complete and has passed a test with exactly that data.
 */
@Injectable()
export class IntegrationProvidersService {
  private readonly testWindow = new RateWindow(TESTS_PER_MINUTE, TEST_WINDOW_MS);

  constructor(
    private readonly repo: IntegrationProviderRepository,
    private readonly codec: ProviderConfigCodec,
    private readonly probes: ProbeRegistry,
    private readonly active: ActiveProviders,
    private readonly config: AppConfig,
    private readonly events: EventEmitter2,
    private readonly clock: Clock,
  ) {}

  async catalog(kind: IntegrationKind): Promise<IntegrationCatalogDto> {
    const rows = await this.repo.findAll(kind);
    const providers = PROVIDERS_OF[kind].map((key) => this.describe(kind, key, rows.find((r) => r.providerKey === key) ?? null));
    return { kind, providers, usingServerSettings: !providers.some((p) => p.isActive) && this.serverSettingsExist(kind) };
  }

  async save(kind: IntegrationKind, providerKey: string, input: SaveProviderInput, actorId: string): Promise<ProviderDto> {
    const key = this.known(kind, providerKey);
    const row = await this.repo.find(kind, key);
    const before = row ? this.codec.decrypt(key, row.config) : {};
    const merged = mergeValues(key, before, input.values);
    const changed = changedFields(key, before, merged);
    // Changed data has not been tried yet, so an active provider is switched off until it is tested and activated again.
    const deactivated = !!row?.isActive && changed.length > 0;
    const saved = await this.repo.save({ ...row, kind, providerKey: key, config: this.codec.encrypt(key, merged), isActive: !!row?.isActive && !deactivated, updatedBy: actorId });
    this.active.invalidate(kind);
    this.audit(actorId, AUDIT.saved, { kind, key }, { fields: changed, deactivated });
    return this.describe(kind, key, saved);
  }

  async test(kind: IntegrationKind, providerKey: string, input: TestProviderInput, actorId: string): Promise<TestResultDto> {
    const key = this.known(kind, providerKey);
    if (!this.testWindow.take(actorId)) throw new ProviderTestRateLimitedError();
    const row = await this.repo.find(kind, key);
    const values = mergeValues(key, row ? this.codec.decrypt(key, row.config) : {}, input.values);
    this.assertComplete(key, values);
    const result = await withTimeout(this.probes.get(kind).run(key, values, input), TEST_TIMEOUT_MS, (): TestResultDto => ({ ok: false, message: 'The service did not answer in time', text: null }));
    const safe = result.ok ? result : { ...result, message: redactSecrets(key, values, result.message ?? '') };
    await this.remember({ kind, key, row }, values, safe.ok, actorId);
    this.audit(actorId, AUDIT.tested, { kind, key }, { ok: safe.ok });
    return safe;
  }

  async activate(kind: IntegrationKind, providerKey: string, actorId: string): Promise<IntegrationCatalogDto> {
    const key = this.known(kind, providerKey);
    const row = await this.repo.find(kind, key);
    if (!row) throw new ProviderIncompleteError(['all'], []);
    const values = this.codec.decrypt(key, row.config);
    this.assertComplete(key, values);
    if (row.verifiedHash !== this.codec.fingerprint(key, values)) throw new ProviderNotTestedError();
    await this.repo.activate(kind, row.id);
    this.active.invalidate(kind);
    this.audit(actorId, AUDIT.activated, { kind, key }, null);
    return this.catalog(kind);
  }

  async deactivate(kind: IntegrationKind, actorId: string): Promise<IntegrationCatalogDto> {
    await this.repo.deactivate(kind);
    this.active.invalidate(kind);
    this.audit(actorId, AUDIT.deactivated, { kind, key: kind }, null);
    return this.catalog(kind);
  }

  private describe(kind: IntegrationKind, key: ProviderKey, row: IntegrationProvider | null): ProviderDto {
    const plain = row ? this.codec.decrypt(key, row.config) : mergeValues(key, {});
    return toProviderDto({ kind, providerKey: key, row, plain, fingerprint: this.codec.fingerprint(key, plain) });
  }

  /** The result of a test is kept against the exact data tried: a pass counts only while the saved data stays the same. */
  private async remember(target: { kind: IntegrationKind; key: ProviderKey; row: IntegrationProvider | null }, values: ProviderValues, ok: boolean, actorId: string): Promise<void> {
    const { kind, key, row } = target;
    const fingerprint = this.codec.fingerprint(key, values);
    if (ok) {
      const config = row?.config ?? this.codec.encrypt(key, mergeValues(key, {}));
      await this.repo.save({ ...row, kind, providerKey: key, config, verifiedHash: fingerprint, verifiedAt: this.clock.now(), updatedBy: actorId });
    } else if (row?.verifiedHash === fingerprint) {
      await this.repo.save({ ...row, verifiedHash: null, verifiedAt: null });
    }
  }

  private known(kind: IntegrationKind, providerKey: string): ProviderKey {
    if (!isProviderOf(kind, providerKey)) throw new NotFoundError('Provider', providerKey);
    return providerKey;
  }

  private assertComplete(key: ProviderKey, values: ProviderValues): void {
    const { missing, invalid } = providerProblems(key, values);
    if (missing.length || invalid.length) throw new ProviderIncompleteError(missing, invalid);
  }

  private serverSettingsExist(kind: IntegrationKind): boolean {
    if (kind === 'captcha' || kind === 'ai') return false;
    return kind === 'email' || this.config.translate !== null;
  }

  private audit(actorId: string, action: string, target: { kind: IntegrationKind; key: string }, changes: Record<string, unknown> | null): void {
    const event: AuditEvent = { actorId, action, entityType: `integration.${target.kind}`, entityId: target.key, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}
