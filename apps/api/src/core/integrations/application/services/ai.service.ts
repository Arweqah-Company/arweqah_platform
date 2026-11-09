import { Injectable } from '@nestjs/common';
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
    const outcome = await this.client.json({ providerKey: provider.providerKey as AiProviderKey, values: provider.values, system: question.system, user: question.user, schema: jsonSchemaOf(question.schema), maxTokens: question.maxTokens });
    if (outcome.kind === 'refused') throw new AiUnavailableError('The model declined to answer');
    if (outcome.kind === 'truncated') throw new AiUnavailableError('The answer was longer than the limit');
    if (outcome.kind === 'failed') throw new AiUnavailableError(redactSecrets(provider.providerKey, provider.values, outcome.message));
    return { value: parse(question.schema, outcome.text), model, inputTokens: outcome.inputTokens, outputTokens: outcome.outputTokens };
  }
}

function parse<T>(schema: z.ZodType<T>, text: string): T {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new AiUnavailableError('The answer was not valid JSON');
  }
  const checked = schema.safeParse(raw);
  if (!checked.success) throw new AiUnavailableError('The answer did not match the expected shape');
  return checked.data;
}

/** The schema as the service wants it: plain JSON Schema without the `$schema` marker. */
export function jsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}
