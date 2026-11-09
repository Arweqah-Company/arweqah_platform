import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { AI_TIMEOUT_MS } from '../../application/messages/integrations.messages';
import { AiClient, type AiJsonOutcome, type AiJsonRequest } from '../../domain/contracts/ai-client';

/** The Messages API with a JSON-schema answer. Streamed (a long answer must not hit an HTTP timeout) and read as one final message. */
@Injectable()
export class AnthropicAiClient extends AiClient {
  async json(request: AiJsonRequest): Promise<AiJsonOutcome> {
    const client = new Anthropic({ apiKey: request.apiKey, timeout: AI_TIMEOUT_MS, maxRetries: 1 });
    try {
      const message = await client.messages
        .stream({
          model: request.model,
          max_tokens: request.maxTokens,
          system: request.system,
          messages: [{ role: 'user', content: request.user }],
          output_config: { format: { type: 'json_schema', schema: request.schema } },
        })
        .finalMessage();
      if (message.stop_reason === 'refusal') return { kind: 'refused' };
      if (message.stop_reason === 'max_tokens') return { kind: 'truncated' };
      const text = message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
      return { kind: 'ok', text, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens };
    } catch (error) {
      return { kind: 'failed', message: describe(error) };
    }
  }
}

/** The service's own words, with the status when it sent one; the key is redacted by the caller (it knows the values). */
function describe(error: unknown): string {
  if (error instanceof Anthropic.APIError) return `${error.status ?? 'network'}: ${error.message}`.slice(0, 500);
  return error instanceof Error ? error.message.slice(0, 500) : 'Unknown error';
}
