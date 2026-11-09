import { AiClient, type AiJsonOutcome, type AiJsonRequest } from '../../src/core/integrations/domain/contracts/ai-client';

/**
 * Anthropic stand-in. Each call takes the next queued answer; with none queued it answers the probe's `{"ok": true}`.
 * A test queues what the model "said" (an object is sent as JSON) or a failed outcome.
 */
export class FakeAiClient extends AiClient {
  readonly calls: AiJsonRequest[] = [];
  private readonly queue: AiJsonOutcome[] = [];

  reset(): void {
    this.calls.length = 0;
    this.queue.length = 0;
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
