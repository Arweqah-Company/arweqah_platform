import { z } from 'zod';

/** What the model answers each call: a short list of steps, done in order (so a question that needs a lookup and a proposal costs two calls, not four). Flat steps, every field a string: the most portable shape for a provider's structured output. */
export const AGENT_STEP_KINDS = ['say', 'describe', 'find', 'guide', 'check', 'propose'] as const;
export type AgentStepKind = (typeof AGENT_STEP_KINDS)[number];

export const agentStepSchema = z.strictObject({
  kind: z.enum(AGENT_STEP_KINDS),
  /** `say`: what the employee reads (a question or an answer). `guide`: the topic of the «how do I…» question. */
  text: z.string(),
  /** `describe`, `find`, `propose`: the action it is about; empty otherwise. */
  operationId: z.string(),
  /** `find`, `propose`: the fields as one JSON object written in a string; `{}` when none. */
  valuesJson: z.string(),
  /** `propose`: one line for the confirmation card, with names and never ids; empty otherwise. */
  summary: z.string(),
  /** `say`: the ids of the manual sections it used (shown in the manual text as [id: …]), as a JSON list; `[]` otherwise. */
  linksJson: z.string(),
  /** `say` with a form: the choices of each field whose value is picked from existing data, `{ "field": [{ "label": "…", "value": "…" }] }`; `{}` otherwise. */
  optionsJson: z.string(),
  /** `say` with a form: the name of each field in the employee's language, `{ "field": "…" }`; `{}` otherwise. */
  labelsJson: z.string(),
});
export type AgentStep = z.infer<typeof agentStepSchema>;

export const agentTurnSchema = z.strictObject({ steps: z.array(agentStepSchema) });
export type AgentTurn = z.infer<typeof agentTurnSchema>;

/** Steps of one call that are carried out (the rest are dropped). */
export const AGENT_MAX_STEPS_PER_CALL = 4;
/** How many model calls one message may take, so a model that keeps asking cannot run up the bill or the waiting. */
export const AGENT_MAX_CALLS = 4;
/** Steps of all the calls of one message together (FR-138). */
export const AGENT_MAX_STEPS = 6;
/** Messages of the conversation the model reads. */
export const AGENT_HISTORY_MESSAGES = 16;
/** Longest data lookup kept and shown to the model. */
export const AGENT_DATA_MAX_CHARS = 6000;

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const SENSITIVE_KEYS = /password|secret|token|national.?id|id.?number|iban|salary|otp|totp|mfa|phone|email/i;

/** The values the model wrote as a JSON object, or null when it did not write one. */
export function parseValues(valuesJson: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(valuesJson || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Every id written anywhere in the values (lower case). */
export function idsIn(values: unknown): string[] {
  return [...(JSON.stringify(values) ?? '').matchAll(UUID)].map((m) => m[0].toLowerCase());
}

/** The ids the model wrote that no data of this conversation shows: it may not invent an id (FR-140). */
export function ungroundedIds(values: unknown, lookedUp: readonly string[]): string[] {
  const known = new Set(lookedUp.flatMap((text) => [...text.matchAll(UUID)].map((m) => m[0].toLowerCase())));
  return [...new Set(idsIn(values))].filter((id) => !known.has(id));
}

/** Data handed to the model without the fields that must never leave the platform (ids, names and labels stay) (FR-144). */
export function withoutSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutSensitive);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !SENSITIVE_KEYS.test(key)).map(([key, v]) => [key, withoutSensitive(v)]));
  }
  return value;
}

const FENCE_TAG = /<\/?\s*(data|employee)\s*>/gi;

/** Text with every fence tag taken out, again and again: removing one can bring the pieces around it together into a new one. */
export function withoutFence(text: string): string {
  let safe = text;
  for (let before = ''; before !== safe; ) {
    before = safe;
    safe = safe.replace(FENCE_TAG, '');
  }
  return safe;
}

/** A short title for a new conversation: the first words of the first message. */
export function titleOf(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length <= 60 ? oneLine : `${oneLine.slice(0, 57)}...`;
}

export function expiryOf(now: Date, minutes: number): Date {
  return new Date(now.getTime() + minutes * 60_000);
}

/** The values split by where each field travels, from the action's fields; a name no field has is returned apart so the draft can say so. */
export function splitByPlace(fields: readonly { name: string; place: 'path' | 'query' | 'body' }[], values: Record<string, unknown>): { path: Record<string, unknown>; query: Record<string, unknown>; body: Record<string, unknown>; unknown: string[] } {
  const out = { path: {} as Record<string, unknown>, query: {} as Record<string, unknown>, body: {} as Record<string, unknown>, unknown: [] as string[] };
  for (const [name, value] of Object.entries(values)) {
    const field = fields.find((f) => f.name === name);
    if (field) out[field.place][name] = value;
    else out.unknown.push(name);
  }
  return out;
}

const STEP_DEFAULTS: Record<string, string> = { kind: '', text: '', operationId: '', valuesJson: '{}', summary: '', linksJson: '[]', optionsJson: '{}', labelsJson: '{}' };

function toStep(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(STEP_DEFAULTS).map(([key, fallback]) => {
      const value = source[key];
      // A model that wrote a JSON field as an object or a list instead of a string.
      if (value && typeof value === 'object') return [key, JSON.stringify(value)];
      return [key, typeof value === 'string' ? value : fallback];
    }),
  );
}

/** The list of raw steps in whatever wrapping the model used: `{ steps }`, a bare list, or one step on its own; null when it is none of them. */
function stepsOf(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return null;
  const object = raw as { steps?: unknown };
  if (Array.isArray(object.steps)) return object.steps;
  return 'kind' in object ? [raw] : null;
}

/** A model that wraps its answer differently still gets through: the list of steps itself, a single step, or a step with a field left out or the values written as an object; anything else is left for the check to refuse. */
export function normalizeTurn(raw: unknown): unknown {
  const fixed = stepsOf(raw)?.map(toStep);
  return fixed && fixed.length > 0 && fixed.every(Boolean) ? { steps: fixed } : raw;
}

const FIRST_STEP_SAYS = /^\s*\{\s*"steps"\s*:\s*\[\s*\{\s*"kind"\s*:\s*"say"\s*,\s*"text"\s*:\s*"/;
const ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f' };

/** The text of a JSON string read so far (it may stop in the middle of a word or of an escape): up to its closing quote, escapes turned into characters. */
function readJsonString(body: string): string {
  let text = '';
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i] as string;
    if (char === '"') break;
    if (char !== '\\') {
      text += char;
      continue;
    }
    const next = body[i + 1];
    if (next === undefined) break;
    if (next === 'u') {
      const hex = body.slice(i + 2, i + 6);
      if (hex.length < 4) break;
      text += String.fromCharCode(Number.parseInt(hex, 16));
      i += 5;
    } else {
      text += ESCAPES[next] ?? next;
      i += 1;
    }
  }
  return text;
}

/**
 * Pulls the words the assistant is writing out of the raw JSON as it arrives (FR-149): only when the FIRST step is a «say» (it ends the turn, so it is never dropped).
 * A step after another one may fail and be dropped, so its text is not shown early; the final message always replaces what was shown.
 */
export class SayTextExtractor {
  private raw = '';
  private shown = 0;

  /** The part of the text that is new since the last piece, or an empty string. */
  push(delta: string): string {
    this.raw += delta;
    const start = FIRST_STEP_SAYS.exec(this.raw);
    if (!start) return '';
    const text = readJsonString(this.raw.slice(start[0].length));
    const fresh = text.slice(this.shown);
    this.shown = text.length;
    return fresh;
  }
}

export interface ChoiceOption {
  label: string;
  value: string;
}

const OPTION_FIELDS_MAX = 10;
const OPTIONS_MAX = 60;
const LABEL_MAX = 120;

function jsonOf(text: string): unknown {
  try {
    return JSON.parse(text || 'null') as unknown;
  } catch {
    return null;
  }
}

/** The manual section ids the model named (a list of strings, at most three). */
export function parseLinkIds(linksJson: string): string[] {
  const parsed = jsonOf(linksJson);
  return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === 'string'))].slice(0, 3) : [];
}

const isOption = (o: unknown): o is ChoiceOption => !!o && typeof o === 'object' && typeof (o as ChoiceOption).label === 'string' && typeof (o as ChoiceOption).value === 'string';

/** The choices the model wrote for each field, with the shapes and sizes limited (whether they are true is checked against the lookup data). */
export function parseOptions(optionsJson: string): Record<string, ChoiceOption[]> {
  const parsed = jsonOf(optionsJson);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return Object.fromEntries(
    Object.entries(parsed)
      .slice(0, OPTION_FIELDS_MAX)
      .map(([field, list]) => [field, Array.isArray(list) ? list.filter(isOption).slice(0, OPTIONS_MAX).map((o) => ({ label: o.label.trim().slice(0, LABEL_MAX), value: o.value.trim() })).filter((o) => o.label && o.value) : []]),
  );
}

/** The field names in the employee's language the model wrote. */
export function parseLabels(labelsJson: string): Record<string, string> {
  const parsed = jsonOf(labelsJson);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed).filter((e): e is [string, string] => typeof e[1] === 'string' && e[1].trim() !== '').map(([k, v]) => [k, v.trim().slice(0, 60)]));
}

const IBAN = /\b[A-Za-z]{2}\d{2}(?:\s?\d){10,30}/g;
const LONG_NUMBER = /\d(?:[\s-]?\d){9,}/g;
export const MASKED_NUMBER = '[hidden number]';

/** What the employee typed, without an IBAN or a number of ten digits or more (a national ID, a card, a phone): the AI service never receives it; the stored message keeps it. */
export function maskSensitive(text: string): string {
  return text.replace(IBAN, MASKED_NUMBER).replace(LONG_NUMBER, MASKED_NUMBER);
}
