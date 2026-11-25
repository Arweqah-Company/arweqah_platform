import { Injectable } from '@nestjs/common';
import { AI_TIMEOUT_MS, MODELS_TIMEOUT_MS } from '../../application/messages/integrations.messages';
import { readChatStream } from './compatible-stream';
import { sortedUnique, withoutModelsPrefix } from './model-names';
import { AiStrategy, type AiJsonOutcome, type AiJsonRequest, type AiModelsOutcome, type AiModelsRequest } from '../../domain/contracts/ai-client';

interface ChatAnswer {
  choices?: { finish_reason?: string | null; message?: { content?: string | null; refusal?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

interface ModelsAnswer extends ChatAnswer {
  data?: { id?: string }[];
  models?: { name?: string }[];
}

/**
 * Any service that speaks the OpenAI `chat/completions` protocol with a JSON-schema answer: Google Gemini's free tier, Groq, OpenRouter…
 * The address comes from the settings (a public https address, checked when it is saved). No `max_tokens` is sent: each model has its own ceiling.
 */
@Injectable()
export class CompatibleStrategy extends AiStrategy {
  readonly providerKey = 'compatible' as const;

  /** The wait before each new try after a busy answer; a test replaces it. */
  protected pause(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async json(request: AiJsonRequest): Promise<AiJsonOutcome> {
    let outcome = await this.once(request);
    for (const wait of RETRY_WAITS_MS) {
      if (!isBusy(outcome)) break;
      await this.pause(wait);
      outcome = await this.once(request);
    }
    return outcome;
  }

  /** `GET {address}/models`: the OpenAI shape (`data[].id`) or Google's own (`models[].name`). */
  async models(request: AiModelsRequest): Promise<AiModelsOutcome> {
    try {
      const response = await fetch(`${String(request.values.baseUrl).replace(/\/+$/, '')}/models`, {
        headers: { authorization: `Bearer ${String(request.values.apiKey)}` },
        signal: AbortSignal.timeout(MODELS_TIMEOUT_MS),
        redirect: 'error',
      });
      const body = answerOf(await response.json().catch(() => null)) as ModelsAnswer;
      if (!response.ok) return { kind: 'failed', message: `${response.status}: ${body.error?.message ?? response.statusText}`.slice(0, 500) };
      const names = [...(body.data ?? []).map((m) => m.id), ...(body.models ?? []).map((m) => m.name)];
      return { kind: 'ok', models: sortedUnique(names.filter((n): n is string => typeof n === 'string' && n !== '').map(withoutModelsPrefix)) };
    } catch (error) {
      return { kind: 'failed', message: error instanceof Error ? error.message.slice(0, 500) : 'Unknown error' };
    }
  }

  private async once(request: AiJsonRequest): Promise<AiJsonOutcome> {
    try {
      const response = await fetch(`${String(request.values.baseUrl).replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${String(request.values.apiKey)}` },
        body: JSON.stringify(bodyOf(request)),
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
        redirect: 'error',
      });
      if (response.ok && request.onText) return await readChatStream(response, request.onText);
      const answer = answerOf(await response.json().catch(() => null));
      if (!response.ok) return failedOutcome(response, answer, request);
      return outcomeOf(answer);
    } catch (error) {
      return { kind: 'failed', message: error instanceof Error ? error.message.slice(0, 500) : 'Unknown error' };
    }
  }
}

/** A free service often answers «overloaded» or «too many requests» for a moment; a new try a few seconds later usually works. */
const BUSY_STATUSES: readonly number[] = [429, 500, 502, 503, 504];
const RETRY_WAITS_MS: readonly number[] = [2_000, 5_000];
const isBusy = (outcome: AiJsonOutcome): boolean => outcome.kind === 'failed' && 'busy' in outcome && outcome.busy === true;

function failedOutcome(response: Response, answer: ChatAnswer, request: AiJsonRequest): AiJsonOutcome {
  const message = `${response.status}: ${answer.error?.message ?? response.statusText}`.slice(0, 500);
  if (BUSY_STATUSES.includes(response.status)) return { kind: 'failed', message, busy: true };
  const refused = IMAGE_REFUSALS.includes(response.status);
  return { kind: 'failed', message, ...(request.images?.length && refused && { imagesRejected: true }), ...(request.audio && refused && { audioUnsupported: true }) };
}

/** A model that does not read pictures answers a request that carries them as malformed. */
const IMAGE_REFUSALS: readonly number[] = [400, 404, 415, 422];

/** Google answers an error with a list holding one object (`[{"error": …}]`), the others with the object itself. */
function answerOf(body: unknown): ChatAnswer {
  const first = Array.isArray(body) ? body[0] : body;
  return first && typeof first === 'object' ? (first as ChatAnswer) : {};
}

function bodyOf(request: AiJsonRequest): Record<string, unknown> {
  return {
    model: String(request.values.model),
    messages: [
      { role: 'system', content: request.system },
      { role: 'user', content: userContent(request) },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'answer', strict: true, schema: request.schema } },
    ...(request.onText && { stream: true, stream_options: { include_usage: true } }),
  };
}

/** The text alone, or the text with the pictures as data addresses (the OpenAI `image_url` part) and the speech (`input_audio`). */
function userContent(request: AiJsonRequest): string | Record<string, unknown>[] {
  if (!request.images?.length && !request.audio) return request.user;
  const pictures = (request.images ?? []).map((image) => ({ type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.data}` } }));
  const speech = request.audio ? [{ type: 'input_audio', input_audio: { data: request.audio.data, format: request.audio.format } }] : [];
  return [{ type: 'text', text: request.user }, ...pictures, ...speech];
}

type Choice = NonNullable<ChatAnswer['choices']>[number];

/** The model declined (its own refusal, or the service's content filter), or the answer hit the model's size ceiling. */
function stopOutcome(choice: Choice): AiJsonOutcome | null {
  if (choice.message?.refusal || choice.finish_reason === 'content_filter') return { kind: 'refused' };
  return choice.finish_reason === 'length' ? { kind: 'truncated' } : null;
}

/** The answer's text and what it used, or a failure that says what was missing. */
function textOutcome(choice: Choice, usage: ChatAnswer['usage']): AiJsonOutcome {
  const text = choice.message?.content ?? '';
  if (!text) return { kind: 'failed', message: 'The answer was empty' };
  return { kind: 'ok', text, inputTokens: usage?.prompt_tokens ?? 0, outputTokens: usage?.completion_tokens ?? 0 };
}

function outcomeOf(answer: ChatAnswer): AiJsonOutcome {
  const choice = answer.choices?.[0];
  if (!choice) return { kind: 'failed', message: 'The service sent no answer' };
  return stopOutcome(choice) ?? textOutcome(choice, answer.usage);
}
