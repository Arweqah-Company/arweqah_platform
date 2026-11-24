import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompatibleStrategy } from './compatible.strategy';

const REQUEST = {
  providerKey: 'compatible' as const,
  values: { apiKey: 'fake-key-for-tests', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-3.8-flash' },
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
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer fake-key-for-tests');
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'gemini-3.8-flash',
      messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: 'doc' }],
      response_format: { type: 'json_schema', json_schema: { name: 'answer', strict: true, schema: { type: 'object' } } },
    });
    expect(init.redirect).toBe('error');
  });

  it('FR-180: pictures go as data addresses after the text; a malformed-request answer to a request with pictures says the model does not read them, a busy one does not', async () => {
    const images = [{ mediaType: 'image/png' as const, data: 'QUJD' }];
    await strategy.json({ ...REQUEST, images });
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0]![1] as RequestInit).body as string) as { messages: { content: unknown }[] };
    expect(body.messages[1]!.content).toEqual([{ type: 'text', text: 'doc' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,QUJD' } }]);
    vi.stubGlobal('fetch', reply({ error: { message: 'image input is not supported' } }, { status: 400 }));
    expect(await strategy.json({ ...REQUEST, images })).toMatchObject({ kind: 'failed', imagesRejected: true });
    expect(await strategy.json(REQUEST)).not.toHaveProperty('imagesRejected');
    vi.stubGlobal('fetch', reply({ error: { message: 'overloaded' } }, { status: 503 }));
    expect(await strategy.json({ ...REQUEST, images })).toMatchObject({ kind: 'failed', busy: true });
  });

  it('FR-181: speech goes as an input_audio part; a malformed-request answer to a request with sound says the model takes none, a busy one does not', async () => {
    const audio = { format: 'wav' as const, data: 'UklGRg==' };
    await strategy.json({ ...REQUEST, audio });
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0]![1] as RequestInit).body as string) as { messages: { content: unknown }[] };
    expect(body.messages[1]!.content).toEqual([{ type: 'text', text: 'doc' }, { type: 'input_audio', input_audio: { data: 'UklGRg==', format: 'wav' } }]);
    vi.stubGlobal('fetch', reply({ error: { message: 'unknown content type input_audio' } }, { status: 400 }));
    expect(await strategy.json({ ...REQUEST, audio })).toMatchObject({ kind: 'failed', audioUnsupported: true });
    expect(await strategy.json(REQUEST)).not.toHaveProperty('audioUnsupported');
    vi.stubGlobal('fetch', reply({ error: { message: 'overloaded' } }, { status: 503 }));
    expect(await strategy.json({ ...REQUEST, audio })).toMatchObject({ kind: 'failed', busy: true });
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
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer fake-key-for-tests');
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

/** The service's event stream, cut in the middle of lines on purpose (a network sends bytes, not lines). */
const sse = (lines: string[], cuts: number[] = []): Response => {
  const bytes = new TextEncoder().encode(lines.map((l) => `data: ${l}\n\n`).join(''));
  const edges = [0, ...cuts, bytes.length];
  const pieces = edges.slice(0, -1).map((from, i) => bytes.slice(from, edges[i + 1]));
  return new Response(new ReadableStream({ start: (c) => { pieces.forEach((p) => c.enqueue(p)); c.close(); } }), { headers: { 'content-type': 'text/event-stream' } });
};
const delta = (content: string, extra: Record<string, unknown> = {}) => JSON.stringify({ choices: [{ delta: { content }, ...extra }] });

describe('The OpenAI-compatible strategy streams the answer when asked (FR-149)', () => {
  const strategy = new QuickStrategy();
  afterEach(() => vi.unstubAllGlobals());

  it('FR-149: asks for a stream, hands every piece of text to onText as it arrives, and the whole answer is the outcome with its usage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sse([delta('{"ste'), delta('ps":[]}'), JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] }), JSON.stringify({ choices: [], usage: { prompt_tokens: 40, completion_tokens: 9 } }), '[DONE]'], [30, 77])));
    const pieces: string[] = [];
    expect(await strategy.json({ ...REQUEST, onText: (d) => pieces.push(d) })).toEqual({ kind: 'ok', text: '{"steps":[]}', inputTokens: 40, outputTokens: 9 });
    expect(pieces).toEqual(['{"ste', 'ps":[]}']);
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({ stream: true, stream_options: { include_usage: true } });
  });

  it('FR-149: without onText nothing is streamed (the plain way stays as it was)', async () => {
    vi.stubGlobal('fetch', reply(chat({ finish_reason: 'stop', message: { content: '{"ok":true}' } })));
    await strategy.json(REQUEST);
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).not.toHaveProperty('stream');
  });

  it('FR-149: a stream that was cut by the size limit, refused, or sent an error is an outcome, not an exception', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(sse([delta('{"a"', { finish_reason: 'length' })])).mockResolvedValueOnce(sse([JSON.stringify({ choices: [{ delta: { refusal: 'no' } }] })])).mockResolvedValueOnce(sse([JSON.stringify({ error: { message: 'quota' } })])));
    expect(await strategy.json({ ...REQUEST, onText: () => undefined })).toEqual({ kind: 'truncated' });
    expect(await strategy.json({ ...REQUEST, onText: () => undefined })).toEqual({ kind: 'refused' });
    expect(await strategy.json({ ...REQUEST, onText: () => undefined })).toEqual({ kind: 'failed', message: 'quota' });
  });
  it('FR-149: a stream that ends without a completion signal is a failure, even when what arrived looks like a whole answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sse([delta('{"ok":true}')])));
    expect(await strategy.json({ ...REQUEST, onText: () => undefined })).toMatchObject({ kind: 'failed', message: expect.stringContaining('before the answer was complete') });
  });

  it('FR-149: a damaged data line fails the answer instead of being dropped (a lost piece would change a number)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sse([delta('{"amount":1'), '{"choices":[{"delta":{"content":"0"', delta('}'), JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })])));
    expect(await strategy.json({ ...REQUEST, onText: () => undefined })).toMatchObject({ kind: 'failed' });
  });

  it('FR-149: a line that never ends, or an answer past the limit, is cut off and fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({ start: (c) => { c.enqueue(new TextEncoder().encode('data: ' + 'x'.repeat(1_100_000))); c.close(); } }))));
    expect(await strategy.json({ ...REQUEST, onText: () => undefined })).toMatchObject({ kind: 'failed' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sse([delta('y'.repeat(1_100_000)), JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })])));
    expect(await strategy.json({ ...REQUEST, onText: () => undefined })).toMatchObject({ kind: 'failed' });
  });
});
