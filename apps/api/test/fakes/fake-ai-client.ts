import { AiClient, type AiJsonOutcome, type AiJsonRequest, type AiModelsOutcome, type AiModelsRequest } from '../../src/core/integrations/domain/contracts/ai-client';

/**
 * Anthropic stand-in. Each call takes the next queued answer; with none queued it answers the probe's `{"ok": true}`.
 * A test queues what the model "said" (an object is sent as JSON) or a failed outcome.
 */
export class FakeAiClient extends AiClient {
  readonly calls: AiJsonRequest[] = [];
  readonly modelCalls: AiModelsRequest[] = [];
  /** What the next lists of models say; empty = a short default list. */
  modelsAnswer: AiModelsOutcome | null = null;
  private readonly queue: AiJsonOutcome[] = [];

  reset(): void {
    this.calls.length = 0;
    this.modelCalls.length = 0;
    this.modelsAnswer = null;
    this.queue.length = 0;
  }

  async models(request: AiModelsRequest): Promise<AiModelsOutcome> {
    this.modelCalls.push(request);
    return this.modelsAnswer ?? { kind: 'ok', models: ['model-b', 'model-a'] };
  }

  answer(what: unknown): void {
    this.queue.push({ kind: 'ok', text: JSON.stringify(what), inputTokens: 1200, outputTokens: 800 });
  }

  fail(outcome: Exclude<AiJsonOutcome, { kind: 'ok' }>): void {
    this.queue.push(outcome);
  }

  async json(request: AiJsonRequest): Promise<AiJsonOutcome> {
    this.calls.push(request);
    return this.queue.shift() ?? { kind: 'ok', text: '{"ok":true}', inputTokens: 5, outputTokens: 5 };
  }
}
