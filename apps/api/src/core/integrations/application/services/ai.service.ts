import { Injectable, Logger } from '@nestjs/common';
import type { AiProviderKey } from '@arweqah-platform/shared';
import { z } from 'zod';
import { redactSecrets } from '../../domain/rules/provider-config.rules';
import { AiClient } from '../../domain/contracts/ai-client';
import { AiNotConfiguredError, AiUnavailableError } from '../../domain/errors/integrations.errors';
import { ActiveProviders } from './active-providers.service';

export interface AiJsonQuestion<T> {
  system: string;
  /** Untrusted text goes here, delimited by the caller. */
  user: string;
  schema: z.ZodType<T>;
  maxTokens: number;
  /** Puts a slightly different answer into the shape the schema asks for before it is checked (a weaker model that wraps or leaves out a field); the check itself still applies. */
  normalize?: (raw: unknown) => unknown;
  /** Each piece of the answer's text as it is written, for a live screen. */
  onText?: (delta: string) => void;
}

export interface AiJsonAnswer<T> {
  value: T;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** What the rest of the platform asks of the AI service: is one switched on, and an answer in a shape it can trust. */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly active: ActiveProviders,
    private readonly client: AiClient,
  ) {}

  async isActive(): Promise<boolean> {
    return (await this.active.of('ai')) !== null;
  }

  /** The answer is constrained to the schema by the service and checked against it again here; anything else is `AI_UNAVAILABLE`. */
  async jsonOf<T>(question: AiJsonQuestion<T>): Promise<AiJsonAnswer<T>> {
    const provider = await this.active.of('ai');
    if (!provider) throw new AiNotConfiguredError();
    const model = String(provider.values.model);
    const outcome = await this.client.json({ providerKey: provider.providerKey as AiProviderKey, values: provider.values, system: question.system, user: question.user, schema: jsonSchemaOf(question.schema), maxTokens: question.maxTokens, onText: question.onText });
    if (outcome.kind === 'refused') throw this.unavailable('The model declined to answer');
    if (outcome.kind === 'truncated') throw this.unavailable('The answer was longer than the limit');
    if (outcome.kind === 'failed') throw this.unavailable(redactSecrets(provider.providerKey, provider.values, outcome.message));
    return { value: this.parsed(question, outcome.text), model, inputTokens: outcome.inputTokens, outputTokens: outcome.outputTokens };
  }

  private unavailable(cause: string): AiUnavailableError {
    this.logger.warn(`AI answer not usable: ${cause}`);
    return new AiUnavailableError(cause);
  }

  private parsed<T>(question: AiJsonQuestion<T>, text: string): T {
    try {
      return parse(question.schema, text, question.normalize);
    } catch (error) {
      this.logger.warn(`AI answer not usable: ${error instanceof Error ? error.message : 'unknown'}; it began: ${text.slice(0, 300)}`);
      throw error;
    }
  }
}

function parse<T>(schema: z.ZodType<T>, text: string, normalize?: (raw: unknown) => unknown): T {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new AiUnavailableError('The answer was not valid JSON');
  }
  const checked = schema.safeParse(normalize ? normalize(raw) : raw);
  if (!checked.success) throw new AiUnavailableError('The answer did not match the expected shape');
  return checked.data;
}

/** The schema as the service wants it: plain JSON Schema without the `$schema` marker. */
export function jsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}
