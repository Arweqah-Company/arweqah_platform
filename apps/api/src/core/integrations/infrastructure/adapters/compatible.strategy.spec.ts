import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompatibleStrategy } from './compatible.strategy';

const REQUEST = {
  providerKey: 'compatible' as const,
  values: { apiKey: 'AIza-key-1234567', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-3.8-flash' },
  system: 'sys',
  user: 'doc',
  schema: { type: 'object' },
  maxTokens: 1000,
};
const reply = (body: unknown, init: ResponseInit = { status: 200 }) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' }, ...init }));
const chat = (choice: Record<string, unknown>) => ({ choices: [choice], usage: { prompt_tokens: 30, completion_tokens: 12 } });

/** The same strategy without the waits between tries. */
class QuickStrategy extends CompatibleStrategy {
  readonly waits: number[] = [];
  protected override async pause(ms: number): Promise<void> {
    this.waits.push(ms);
  }
}

describe('The OpenAI-compatible strategy of the AI service (FR-126)', () => {
  const strategy = new QuickStrategy();
  beforeEach(() => vi.stubGlobal('fetch', reply(chat({ finish_reason: 'stop', message: { content: '{"ok":true}' } }))));
  afterEach(() => vi.unstubAllGlobals());

  it('FR-126: posts to the address\'s chat/completions with the key as a bearer, the model, both turns and the schema as the answer format', async () => {
    expect(await strategy.json(REQUEST)).toEqual({ kind: 'ok', text: '{"ok":true}', inputTokens: 30, outputTokens: 12 });
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer AIza-key-1234567');
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'gemini-3.8-flash',
      messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: 'doc' }],
      response_format: { type: 'json_schema', json_schema: { name: 'answer', strict: true, schema: { type: 'object' } } },
    });
    expect(init.redirect).toBe('error');
  });

  it('FR-126: an address with no trailing slash works the same', async () => {
    await strategy.json({ ...REQUEST, values: { ...REQUEST.values, baseUrl: 'https://api.groq.com/openai/v1' } });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://api.groq.com/openai/v1/chat/completions');
  });

  it('FR-126: a cut-off answer, a refusal and a filtered answer are outcomes', async () => {
    vi.stubGlobal('fetch', reply(chat({ finish_reason: 'length', message: { content: '{"a"' } })));
    expect(await strategy.json(REQUEST)).toEqual({ kind: 'truncated' });
    vi.stubGlobal('fetch', reply(chat({ finish_reason: 'stop', message: { content: null, refusal: 'no' } })));
    expect(await strategy.json(REQUEST)).toEqual({ kind: 'refused' });
    vi.stubGlobal('fetch', reply(chat({ finish_reason: 'content_filter', message: { content: '' } })));
    expect(await strategy.json(REQUEST)).toEqual({ kind: 'refused' });
  });

  it('FR-126: an HTTP error carries the service\'s message and status; an empty body and a missing answer are failures', async () => {
    vi.stubGlobal('fetch', reply({ error: { message: 'API key not valid' } }, { status: 400 }));
    expect(await strategy.json(REQUEST)).toEqual({ kind: 'failed', message: '400: API key not valid' });
    vi.stubGlobal('fetch', reply({ choices: [] }));
    expect(await strategy.json(REQUEST)).toEqual({ kind: 'failed', message: 'The service sent no answer' });
    vi.stubGlobal('fetch', reply(chat({ finish_reason: 'stop', message: { content: '' } })));
    expect(await strategy.json(REQUEST)).toEqual({ kind: 'failed', message: 'The answer was empty' });
  });

  it('FR-126: a network failure or a timeout is a failed outcome, never a throw', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND')));
    expect(await strategy.json(REQUEST)).toEqual({ kind: 'failed', message: 'getaddrinfo ENOTFOUND' });
  });

  it('FR-126: reads the message of an error Google sends as a list (`[{"error": …}]`), so the person sees the real reason', async () => {
    vi.stubGlobal('fetch', reply([{ error: { code: 400, message: 'Please pass a valid API key', status: 'INVALID_ARGUMENT' } }], { status: 400 }));
    expect(await strategy.json(REQUEST)).toMatchObject({ kind: 'failed', message: '400: Please pass a valid API key' });
  });

  it('FR-126: a busy service (503, 429…) is tried again after a short wait and the later answer is used', async () => {
    const busy = new Response(JSON.stringify([{ error: { message: 'The model is overloaded. Please try again later.' } }]), { status: 503 });
    const good = new Response(JSON.stringify(chat({ finish_reason: 'stop', message: { content: '{"ok":true}' } })), { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(busy).mockResolvedValueOnce(good));
    const quick = new QuickStrategy();
    expect(await quick.json(REQUEST)).toMatchObject({ kind: 'ok' });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    expect(quick.waits).toEqual([2000]);
  });

  it('FR-126: a service that stays busy is given up after two more tries, with its own message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify([{ error: { message: 'The model is overloaded. Please try again later.' } }]), { status: 503 })));
    const quick = new QuickStrategy();
    expect(await quick.json(REQUEST)).toMatchObject({ kind: 'failed', message: '503: The model is overloaded. Please try again later.' });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
    expect(quick.waits).toEqual([2000, 5000]);
  });

  it('FR-126: a wrong key (400, 401, 403) is not tried again', async () => {
    vi.stubGlobal('fetch', reply({ error: { message: 'bad key' } }, { status: 401 }));
    await strategy.json(REQUEST);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('FR-126: lists the models of the address with the key, from the OpenAI shape (`data[].id`), sorted and without repeats', async () => {
    vi.stubGlobal('fetch', reply({ object: 'list', data: [{ id: 'llama-b' }, { id: 'llama-a' }, { id: 'llama-b' }] }));
    expect(await strategy.models(REQUEST)).toEqual({ kind: 'ok', models: ['llama-a', 'llama-b'] });
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/openai/models');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer AIza-key-1234567');
  });

  it('FR-126: reads Google\'s own shape too (`models[].name` with the `models/` prefix) and drops the prefix', async () => {
    vi.stubGlobal('fetch', reply({ models: [{ name: 'models/gemini-3.6-flash' }, { name: 'models/gemini-3.5-flash-lite' }] }));
    expect(await strategy.models(REQUEST)).toEqual({ kind: 'ok', models: ['gemini-3.5-flash-lite', 'gemini-3.6-flash'] });
  });

  it('FR-126: a refused key or a network failure while listing is a failed outcome with the service\'s words', async () => {
    vi.stubGlobal('fetch', reply([{ error: { message: 'API key not valid' } }], { status: 400 }));
    expect(await strategy.models(REQUEST)).toEqual({ kind: 'failed', message: '400: API key not valid' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND')));
    expect(await strategy.models(REQUEST)).toEqual({ kind: 'failed', message: 'getaddrinfo ENOTFOUND' });
  });
});
