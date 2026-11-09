import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { AI_TIMEOUT_MS, MODELS_TIMEOUT_MS } from '../../application/messages/integrations.messages';
import { sortedUnique } from './model-names';
import { AiStrategy, type AiJsonOutcome, type AiJsonRequest, type AiModelsOutcome, type AiModelsRequest } from '../../domain/contracts/ai-client';

/** Claude through the official SDK: the Messages API with a JSON-schema answer, streamed (a long answer must not hit an HTTP timeout) and read as one final message. */
@Injectable()
export class AnthropicStrategy extends AiStrategy {
  readonly providerKey = 'anthropic' as const;

  async json(request: AiJsonRequest): Promise<AiJsonOutcome> {
    const client = new Anthropic({ apiKey: String(request.values.apiKey), timeout: AI_TIMEOUT_MS, maxRetries: 0 });
    try {
      const message = await client.messages
        .stream({
          model: String(request.values.model),
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

  models(request: AiModelsRequest): Promise<AiModelsOutcome> {
    return listModels(request);
  }
}

/** Claude's models for this key, through the SDK's paged list. */
async function listModels(request: AiModelsRequest): Promise<AiModelsOutcome> {
  const client = new Anthropic({ apiKey: String(request.values.apiKey), timeout: MODELS_TIMEOUT_MS, maxRetries: 0 });
  try {
    const ids: string[] = [];
    for await (const model of client.models.list({ limit: 100 })) ids.push(model.id);
    return { kind: 'ok', models: sortedUnique(ids) };
  } catch (error) {
    return { kind: 'failed', message: describe(error) };
  }
}

/** The service's own words, with the status when it sent one; the key is redacted by the caller (it knows the values). */
function describe(error: unknown): string {
  if (error instanceof Anthropic.APIError) return `${error.status ?? 'network'}: ${error.message}`.slice(0, 500);
  return error instanceof Error ? error.message.slice(0, 500) : 'Unknown error';
}
