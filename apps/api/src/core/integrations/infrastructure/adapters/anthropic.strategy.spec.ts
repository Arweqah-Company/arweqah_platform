import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnthropicStrategy } from './anthropic.strategy';

const sdk = vi.hoisted(() => {
  class APIError extends Error {
    constructor(readonly status: number, message: string) {
      super(message);
    }
  }
  const state = { constructed: [] as unknown[], streamed: [] as unknown[], reply: (): Promise<unknown> => Promise.resolve({}), models: (): unknown => ({}) };
  class Anthropic {
    static APIError = APIError;
    constructor(options: unknown) {
      state.constructed.push(options);
    }
    models = {
      list: () => (state.models as () => AsyncIterable<{ id: string }>)(),
    };
    messages = {
      stream: (params: unknown) => {
        state.streamed.push(params);
        return { finalMessage: () => state.reply() };
      },
    };
  }
  return { Anthropic, APIError, state };
});
vi.mock('@anthropic-ai/sdk', () => ({ default: sdk.Anthropic }));

const REQUEST = { providerKey: 'anthropic' as const, values: { apiKey: 'sk-ant-key-1234', model: 'claude-opus-5-5' }, system: 'sys', user: 'doc', schema: { type: 'object' }, maxTokens: 1000 };
const message = (extra: Record<string, unknown>) => ({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"ok":true}' }], usage: { input_tokens: 11, output_tokens: 7 }, ...extra });

describe('The Anthropic strategy of the AI service (FR-126)', () => {
  const client = new AnthropicStrategy();
  beforeEach(() => {
    sdk.state.constructed.length = 0;
    sdk.state.streamed.length = 0;
  });

  it('FR-126: sends the key, the model, the schema as the answer format and the document in the user turn; reads only the text blocks', async () => {
    sdk.state.reply = () => Promise.resolve(message({}));
    expect(await client.json(REQUEST)).toEqual({ kind: 'ok', text: '{"ok":true}', inputTokens: 11, outputTokens: 7 });
    expect(sdk.state.constructed[0]).toMatchObject({ apiKey: REQUEST.values.apiKey, maxRetries: 0 });
    expect(sdk.state.streamed[0]).toMatchObject({ model: REQUEST.values.model, max_tokens: 1000, system: 'sys', messages: [{ role: 'user', content: 'doc' }], output_config: { format: { type: 'json_schema', schema: { type: 'object' } } } });
    expect(JSON.stringify(sdk.state.streamed[0])).not.toContain('tools');
  });

  it('FR-126: a refusal and a cut-off answer are outcomes, not errors', async () => {
    sdk.state.reply = () => Promise.resolve(message({ stop_reason: 'refusal' }));
    expect(await client.json(REQUEST)).toEqual({ kind: 'refused' });
    sdk.state.reply = () => Promise.resolve(message({ stop_reason: 'max_tokens' }));
    expect(await client.json(REQUEST)).toEqual({ kind: 'truncated' });
  });

  it('FR-126: the service\'s error (with its status) and a network failure become a failed outcome, never a throw', async () => {
    sdk.state.reply = () => Promise.reject(new sdk.APIError(401, 'invalid x-api-key'));
    expect(await client.json(REQUEST)).toEqual({ kind: 'failed', message: '401: invalid x-api-key' });
    sdk.state.reply = () => Promise.reject(new Error('socket hang up'));
    expect(await client.json(REQUEST)).toEqual({ kind: 'failed', message: 'socket hang up' });
  });

  it('FR-126: lists the models of the key through the SDK\'s paged list, sorted, and a refused key is a failed outcome', async () => {
    sdk.state.models = async function* () {
      yield { id: 'claude-sonnet-5-5' };
      yield { id: 'claude-opus-5-5' };
    };
    expect(await client.models(REQUEST)).toEqual({ kind: 'ok', models: ['claude-opus-5-5', 'claude-sonnet-5-5'] });
    sdk.state.models = () => ({ [Symbol.asyncIterator]: () => ({ next: () => Promise.reject(new sdk.APIError(401, 'invalid x-api-key')) }) });
    expect(await client.models(REQUEST)).toEqual({ kind: 'failed', message: '401: invalid x-api-key' });
  });
});
