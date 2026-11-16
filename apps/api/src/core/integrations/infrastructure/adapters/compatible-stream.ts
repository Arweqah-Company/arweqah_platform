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
  if (choice.finish_reason) reading.finish = choice.finish_reason;
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

/** One `data:` line of the event stream (a line that is not data, or not JSON, is ignored). */
function chunkOf(line: string): StreamChunk | null {
  if (!line.startsWith('data:')) return null;
  const payload = line.slice(5).trim();
  if (!payload || payload === '[DONE]') return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    return first && typeof first === 'object' ? (first as StreamChunk) : null;
  } catch {
    return null;
  }
}

function outcomeOf(reading: Reading): AiJsonOutcome {
  if (reading.error) return { kind: 'failed', message: reading.error.slice(0, 500) };
  if (reading.refused || reading.finish === 'content_filter') return { kind: 'refused' };
  if (reading.finish === 'length') return { kind: 'truncated' };
  if (!reading.text) return { kind: 'failed', message: 'The answer was empty' };
  return { kind: 'ok', text: reading.text, inputTokens: reading.inputTokens, outputTokens: reading.outputTokens };
}

/** Reads a `stream: true` answer: each piece of text goes to `onText` as it arrives, and the whole answer is the outcome, as for a plain answer. */
export async function readChatStream(response: Response, onText: (delta: string) => void): Promise<AiJsonOutcome> {
  const reader = response.body?.getReader();
  if (!reader) return { kind: 'failed', message: 'The service sent no stream' };
  const decoder = new TextDecoder();
  const reading: Reading = { text: '', finish: null, refused: false, error: null, inputTokens: 0, outputTokens: 0 };
  let pending = '';
  for (let part = await reader.read(); !part.done; part = await reader.read()) {
    pending += decoder.decode(part.value, { stream: true });
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    for (const line of lines) {
      const chunk = chunkOf(line.trim());
      if (chunk) take(chunk, reading, onText);
    }
  }
  const last = chunkOf(pending.trim());
  if (last) take(last, reading, onText);
  return outcomeOf(reading);
}
