import { Injectable, OnModuleInit } from '@nestjs/common';
import type { AiProviderKey, ProviderKey, ProviderValues, TestProviderInput, TestResultDto } from '@arweqah-platform/shared';
import { AiClient } from '../../domain/contracts/ai-client';
import { ProviderProbe } from '../../domain/contracts/provider-probe';
import { AI_PROBE_MAX_TOKENS } from '../messages/integrations.messages';
import { ProbeRegistry } from './probe-registry';

const PING_SCHEMA = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false };

/** How the AI service is tried from the dashboard: one tiny real request with the key and model in the form. */
@Injectable()
export class AiProbe extends ProviderProbe implements OnModuleInit {
  readonly kind = 'ai' as const;

  constructor(
    private readonly client: AiClient,
    private readonly registry: ProbeRegistry,
  ) {
    super();
  }

  onModuleInit(): void {
    this.registry.register(this);
  }

  async run(providerKey: ProviderKey, values: ProviderValues, _input: TestProviderInput): Promise<TestResultDto> {
    const outcome = await this.client.json({ providerKey: providerKey as AiProviderKey, values, system: 'Answer with the JSON {"ok": true}.', user: 'ping', schema: PING_SCHEMA, maxTokens: AI_PROBE_MAX_TOKENS });
    if (outcome.kind === 'ok') return { ok: true, message: null, text: null };
    return { ok: false, message: outcome.kind === 'failed' ? outcome.message : `The service answered, but not usably (${outcome.kind})`, text: null };
  }
}
