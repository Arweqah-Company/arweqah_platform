import { Injectable } from '@nestjs/common';
import { isProviderOf, providerProblems, type AiModelsDto, type AiProviderKey, type ProviderKey, type TestProviderInput } from '@arweqah-platform/shared';
import { RateWindow } from '../../../../common/application/rate-window';
import { withTimeout } from '../../../../common/application/with-timeout';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AiClient, type AiModelsOutcome } from '../../domain/contracts/ai-client';
import { IntegrationProviderRepository } from '../../domain/contracts/integration-provider.repository';
import { ProviderIncompleteError, ProviderTestRateLimitedError } from '../../domain/errors/integrations.errors';
import { mergeValues, redactSecrets } from '../../domain/rules/provider-config.rules';
import { MODELS_TIMEOUT_MS, TESTS_PER_MINUTE, TEST_WINDOW_MS } from '../messages/integrations.messages';
import { ProviderConfigCodec } from './provider-config.codec';

/** The models an AI service offers to the key in the form (the saved data fills what the form leaves out), so the person picks one instead of typing its name. */
@Injectable()
export class AiModelsService {
  private readonly window = new RateWindow(TESTS_PER_MINUTE, TEST_WINDOW_MS);

  constructor(
    private readonly repo: IntegrationProviderRepository,
    private readonly codec: ProviderConfigCodec,
    private readonly client: AiClient,
  ) {}

  async list(providerKey: string, input: TestProviderInput, actorId: string): Promise<AiModelsDto> {
    if (!isProviderOf('ai', providerKey)) throw new NotFoundError('Provider', providerKey);
    if (!this.window.take(actorId)) throw new ProviderTestRateLimitedError();
    const row = await this.repo.find('ai', providerKey);
    const values = mergeValues(providerKey, row ? this.codec.decrypt(providerKey, row.config) : {}, input.values);
    const { missing, invalid } = providerProblems(providerKey, values);
    if (missing.length || invalid.length) throw new ProviderIncompleteError(missing, invalid);
    const outcome = await withTimeout(this.client.models({ providerKey: providerKey as AiProviderKey, values }), MODELS_TIMEOUT_MS + 2_000, (): AiModelsOutcome => ({ kind: 'failed', message: 'The service did not answer in time' }));
    return outcome.kind === 'ok' ? { ok: true, models: outcome.models, message: null } : { ok: false, models: [], message: redactSecrets(providerKey as ProviderKey, values, outcome.message) };
  }
}
