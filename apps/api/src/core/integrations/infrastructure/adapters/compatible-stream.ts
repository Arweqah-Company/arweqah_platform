import type { AiJsonOutcome } from '../../domain/contracts/ai-client';

interface StreamChunk {
  choices?: { finish_reason?: string | null; delta?: { content?: string | null; refusal?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
  error?: { message?: string };
}

/** What is read so far from the stream of an OpenAI-compatible service. */
interface Reading {
  text: string;
  finish: string | null;
  refused: boolean;
  error: string | null;
  /** The service said the answer is complete: a `finish_reason` or the `[DONE]` line. */
  complete: boolean;
  inputTokens: number;
  outputTokens: number;
}

type Choice = NonNullable<StreamChunk['choices']>[number];

function takeChoice(choice: Choice, reading: Reading, onText: (delta: string) => void): void {
  if (choice.delta?.refusal) reading.refused = true;
  if (choice.delta?.content) {
    reading.text += choice.delta.content;
    onText(choice.delta.content);
  }
  if (choice.finish_reason) {
    reading.finish = choice.finish_reason;
    reading.complete = true;
  }
}

function take(chunk: StreamChunk, reading: Reading, onText: (delta: string) => void): void {
  if (chunk.error) reading.error = chunk.error.message ?? 'The service sent an error';
  const choice = chunk.choices?.[0];
  if (choice) takeChoice(choice, reading, onText);
  if (chunk.usage) {
    reading.inputTokens = chunk.usage.prompt_tokens ?? reading.inputTokens;
    reading.outputTokens = chunk.usage.completion_tokens ?? reading.outputTokens;
  }
}

/** The most a line without its end, and the whole answer, may grow to: a service that never stops sending cannot fill the memory. */
const MAX_LINE_CHARS = 1_000_000;
const MAX_TEXT_CHARS = 1_000_000;

type Line = { kind: 'skip' } | { kind: 'done' } | { kind: 'broken' } | { kind: 'chunk'; chunk: StreamChunk };

/** One line of the event stream: a `data:` line with its JSON, the end mark, a damaged data line (its piece of the answer is lost), or a line that carries nothing (a comment, a name, an empty line). */
function lineOf(line: string): Line {
  if (!line.startsWith('data:')) return { kind: 'skip' };
  const payload = line.slice(5).trim();
  if (!payload) return { kind: 'skip' };
  if (payload === '[DONE]') return { kind: 'done' };
  try {
    const parsed: unknown = JSON.parse(payload);
    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    return first && typeof first === 'object' ? { kind: 'chunk', chunk: first as StreamChunk } : { kind: 'broken' };
  } catch {
    return { kind: 'broken' };
  }
}

function outcomeOf(reading: Reading): AiJsonOutcome {
  if (reading.error) return { kind: 'failed', message: reading.error.slice(0, 500) };
  if (reading.refused || reading.finish === 'content_filter') return { kind: 'refused' };
  if (reading.finish === 'length') return { kind: 'truncated' };
  if (!reading.complete) return { kind: 'failed', message: 'The stream ended before the answer was complete' };
  if (!reading.text) return { kind: 'failed', message: 'The answer was empty' };
  return { kind: 'ok', text: reading.text, inputTokens: reading.inputTokens, outputTokens: reading.outputTokens };
}

/** Takes one line into the reading; false when the stream must stop (a damaged data line, or an answer too long). */
function accept(line: string, reading: Reading, onText: (delta: string) => void): boolean {
  const parsed = lineOf(line.trim());
  if (parsed.kind === 'broken') return false;
  if (parsed.kind === 'done') reading.complete = true;
  if (parsed.kind === 'chunk') take(parsed.chunk, reading, onText);
  return reading.text.length <= MAX_TEXT_CHARS;
}

/** Reads a `stream: true` answer: each piece of text goes to `onText` as it arrives, and the whole answer is the outcome, as for a plain answer. */
export async function readChatStream(response: Response, onText: (delta: string) => void): Promise<AiJsonOutcome> {
  const reader = response.body?.getReader();
  if (!reader) return { kind: 'failed', message: 'The service sent no stream' };
  const decoder = new TextDecoder();
  const reading: Reading = { text: '', finish: null, refused: false, error: null, complete: false, inputTokens: 0, outputTokens: 0 };
  let pending = '';
  for (let part = await reader.read(); !part.done; part = await reader.read()) {
    pending += decoder.decode(part.value, { stream: true });
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    if (pending.length > MAX_LINE_CHARS || !lines.every((line) => accept(line, reading, onText))) {
      await reader.cancel().catch(() => undefined);
      return { kind: 'failed', message: 'The stream was damaged or too long' };
    }
  }
  if (!accept(pending, reading, onText)) return { kind: 'failed', message: 'The stream was damaged or too long' };
  return outcomeOf(reading);
}
