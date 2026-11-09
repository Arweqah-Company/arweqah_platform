import { describe, expect, it } from 'vitest';
import { AiStrategy, type AiJsonOutcome, type AiJsonRequest, type AiModelsOutcome } from '../../domain/contracts/ai-client';
import { AiStrategyClient } from './ai-strategy.client';

class Stub extends AiStrategy {
  readonly calls: AiJsonRequest[] = [];
  constructor(readonly providerKey: 'anthropic' | 'compatible', private readonly text: string) {
    super();
  }
  async json(request: AiJsonRequest): Promise<AiJsonOutcome> {
    this.calls.push(request);
    return { kind: 'ok', text: this.text, inputTokens: 1, outputTokens: 1 };
  }
  async models(): Promise<AiModelsOutcome> {
    return { kind: 'ok', models: [this.text] };
  }
}

const request = (providerKey: 'anthropic' | 'compatible'): AiJsonRequest => ({ providerKey, values: {}, system: 's', user: 'u', schema: {}, maxTokens: 1 });

describe('Choosing the strategy of the AI provider (FR-126)', () => {
  it('FR-126: each request goes to the strategy of the provider it names, and to no other', async () => {
    const claude = new Stub('anthropic', 'from claude');
    const free = new Stub('compatible', 'from the free one');
    const client = new AiStrategyClient([claude, free]);
    expect(await client.json(request('compatible'))).toMatchObject({ text: 'from the free one' });
    expect(await client.json(request('anthropic'))).toMatchObject({ text: 'from claude' });
    expect(free.calls).toHaveLength(1);
    expect(claude.calls).toHaveLength(1);
  });

  it('FR-126: a provider with no strategy is a failed outcome that says so', async () => {
    const client = new AiStrategyClient([new Stub('anthropic', 'x')]);
    expect(await client.json(request('compatible'))).toEqual({ kind: 'failed', message: 'No strategy for the provider compatible' });
  });

  it('FR-126: the list of models also goes to the provider\'s own strategy, and a provider with none fails in words', async () => {
    const client = new AiStrategyClient([new Stub('anthropic', 'claude-list'), new Stub('compatible', 'free-list')]);
    expect(await client.models({ providerKey: 'compatible', values: {} })).toEqual({ kind: 'ok', models: ['free-list'] });
    expect(await new AiStrategyClient([]).models({ providerKey: 'anthropic', values: {} })).toEqual({ kind: 'failed', message: 'No strategy for the provider anthropic' });
  });
});
