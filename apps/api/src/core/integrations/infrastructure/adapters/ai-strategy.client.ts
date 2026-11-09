import { Inject, Injectable } from '@nestjs/common';
import { AiClient, AiStrategy, type AiJsonOutcome, type AiJsonRequest, type AiModelsOutcome, type AiModelsRequest } from '../../domain/contracts/ai-client';

/** The strategies the platform knows, one per provider of the AI settings. */
export const AI_STRATEGIES = Symbol('AI_STRATEGIES');

/** The one `AiClient`: hands every request to the strategy of the provider it names (the way the translator resolver picks a translator). */
@Injectable()
export class AiStrategyClient extends AiClient {
  constructor(@Inject(AI_STRATEGIES) private readonly strategies: readonly AiStrategy[]) {
    super();
  }

  json(request: AiJsonRequest): Promise<AiJsonOutcome> {
    const strategy = this.strategyOf(request.providerKey);
    return strategy ? strategy.json(request) : Promise.resolve({ kind: 'failed', message: missing(request.providerKey) });
  }

  models(request: AiModelsRequest): Promise<AiModelsOutcome> {
    const strategy = this.strategyOf(request.providerKey);
    return strategy ? strategy.models(request) : Promise.resolve({ kind: 'failed', message: missing(request.providerKey) });
  }

  private strategyOf(providerKey: string): AiStrategy | undefined {
    return this.strategies.find((s) => s.providerKey === providerKey);
  }
}

const missing = (providerKey: string): string => `No strategy for the provider ${providerKey}`;
