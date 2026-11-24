import type { AgentFormFieldDto, AgentFormFieldType, AgentFormOptionDto } from '@arweqah-platform/shared';
import type { AgentAction, AgentField } from '../types/agent-catalog.types';
import { normalizeText } from './agent-guide.rules';
import { ungroundedIds, type ChoiceOption } from './agent-turn.rules';

type Schema = Record<string, unknown>;

const LONG_TEXT_FROM = 200;

/** A schema without its «or null» branch (a field that may be left out is `anyOf: [{…}, {type: 'null'}]` or `type: [..., 'null']`). */
function unwrap(schema: Schema): Schema {
  const alternatives = schema.anyOf;
  if (Array.isArray(alternatives)) return (alternatives.find((a: Schema) => a.type !== 'null') as Schema | undefined) ?? schema;
  if (Array.isArray(schema.type)) return { ...schema, type: schema.type.find((t) => t !== 'null') };
  return schema;
}

type Constant = string | number;

/** The fixed values a field may take: an `enum`, or a union of `const`s (`z.union([z.literal(0), z.literal(1)])`), «or null» left out; null when the field is not such a set. */
function constants(rawSchema: Schema): Constant[] | null {
  const isConstant = (v: unknown): v is Constant => typeof v === 'string' || typeof v === 'number';
  if (Array.isArray(rawSchema.enum)) return rawSchema.enum.every(isConstant) ? rawSchema.enum : null;
  const alternatives = Array.isArray(rawSchema.anyOf) ? (rawSchema.anyOf as Schema[]).filter((a) => a.type !== 'null') : [];
  if (alternatives.length === 0 || !alternatives.every((a) => isConstant(a.const))) return null;
  return alternatives.map((a) => a.const as Constant);
}

/** How a field of the action is drawn in a form, or null when a form cannot draw it (a list, an object): the assistant then keeps to questions. */
export function formFieldType(rawSchema: Schema): AgentFormFieldType | null {
  if (constants(rawSchema)) return 'select';
  const schema = unwrap(rawSchema);
  if (schema.format === 'uuid') return 'select';
  if (schema.type === 'string') return schema.format === 'date' ? 'date' : typeof schema.maxLength === 'number' && schema.maxLength > LONG_TEXT_FROM ? 'longtext' : 'text';
  if (schema.type === 'number' || schema.type === 'integer' || schema.type === 'boolean') return schema.type;
  return null;
}

/** `nameAr` → «Name ar»: the fallback name of a field when the model gave none. */
export function humanize(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const RECORD_MAX_CHARS = 2000;

/** Which characters of the text lie inside a JSON string (a brace there is part of a name, not of the structure). */
function insideStrings(text: string): boolean[] {
  const inside: boolean[] = [];
  let open = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    inside.push(open);
    if (escaped) escaped = false;
    else if (open && char === '\\') escaped = true;
    else if (char === '"') open = !open;
  }
  return inside;
}

/** Where the object that holds `at` opens: the nearest `{` that no closed object lies between (0 when the data was cut before it). */
function recordStart(text: string, at: number, inside: boolean[]): number {
  let depth = 0;
  for (let i = at; i >= 0 && at - i < RECORD_MAX_CHARS; i--) {
    if (inside[i] || (text[i] !== '{' && text[i] !== '}')) continue;
    if (text[i] === '}') depth++;
    else if (depth-- === 0) return i;
  }
  return 0;
}

/** Where that object closes (the end of the text when the data was cut short). */
function recordEnd(text: string, at: number, inside: boolean[]): number {
  let depth = 0;
  for (let i = at; i < text.length && i - at < RECORD_MAX_CHARS; i++) {
    if (inside[i] || (text[i] !== '{' && text[i] !== '}')) continue;
    if (text[i] === '{') depth++;
    else if (depth-- === 0) return i + 1;
  }
  return text.length;
}

/** The object that holds the text at `at`, found by counting braces (the data may be cut short, so it is not parsed as JSON). */
function recordAround(text: string, at: number, inside: boolean[]): string {
  return text.slice(recordStart(text, at, inside), recordEnd(text, at, inside));
}

/** Every value in `options` must be an id some lookup showed, inside the same record as the label the model gave it (so a name is never put on another id). */
export function pairedInData(option: ChoiceOption, dataTexts: readonly string[]): boolean {
  const wanted = normalizeText(option.label);
  const value = option.value.toLowerCase();
  return dataTexts.some((text) => {
    const lower = text.toLowerCase();
    const inside = insideStrings(text);
    for (let at = lower.indexOf(value); at !== -1; at = lower.indexOf(value, at + 1)) {
      if (normalizeText(recordAround(text, at, inside)).includes(wanted)) return true;
    }
    return false;
  });
}

/** The values the model understood, without any id no lookup showed: what is kept (hidden ids included) counts as looked up when the form is sent. */
export function groundedValues(values: Record<string, unknown>, lookedUp: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => ungroundedIds(value, lookedUp).length === 0));
}

export interface FormInput {
  action: AgentAction;
  values: Record<string, unknown>;
  /** The model's choices per field, already checked against the lookup data. */
  options: Record<string, ChoiceOption[]>;
  labels: Record<string, string>;
  /** The language the labels of a fixed list (priority: normal / urgent) are written in. */
  locale: 'ar' | 'en';
}

/** The choices of a field that is a fixed set, each as text (a number stays a number in the answer, see `numeric`); the route may name them in both languages with `optionLabels`. */
function fixedOptions(schema: Schema, locale: 'ar' | 'en'): AgentFormOptionDto[] | null {
  const list = constants(schema);
  const named = (schema.optionLabels ?? {}) as Record<string, { ar?: string; en?: string }>;
  return list && list.map((v) => ({ label: named[String(v)]?.[locale] ?? String(v), value: String(v) }));
}

const isNumeric = (schema: Schema): boolean => constants(schema)?.every((v) => typeof v === 'number') === true;

function limits(schema: Schema): Pick<AgentFormFieldDto, 'min' | 'max' | 'maxLength'> {
  const s = unwrap(schema);
  return {
    ...(typeof s.minimum === 'number' && { min: s.minimum }),
    ...(typeof s.maximum === 'number' && { max: s.maximum }),
    ...(typeof s.maxLength === 'number' && { maxLength: s.maxLength }),
  };
}

function fieldOf(field: AgentField, input: FormInput): AgentFormFieldDto | 'hidden' | null {
  const type = formFieldType(field.schema);
  if (!type) return null;
  const base = { name: field.name, label: input.labels[field.name] ?? humanize(field.name), required: field.required, type, ...limits(field.schema) };
  if (type !== 'select') return base;
  const fixed = fixedOptions(field.schema, input.locale);
  const options = fixed ?? input.options[field.name] ?? [];
  if (options.length > 0) return { ...base, options, ...(fixed && isNumeric(field.schema) && { numeric: true }) };
  // An id the assistant already holds but cannot name: it stays in the values, out of the form.
  return input.values[field.name] === undefined ? null : 'hidden';
}

/** The form for an action, or null when it cannot be drawn: a mandatory field of a kind a form does not draw, or a mandatory id to choose with no choices to show. */
export function buildForm(input: FormInput): { fields: AgentFormFieldDto[]; values: Record<string, unknown> } | null {
  const fields: AgentFormFieldDto[] = [];
  for (const field of input.action.fields) {
    const drawn = fieldOf(field, input);
    // A field a form cannot draw is left out when it is optional; when it is mandatory the assistant keeps to questions.
    if (drawn === null && field.required) return null;
    if (drawn !== null && drawn !== 'hidden') fields.push(drawn);
  }
  return fields.length > 0 ? { fields, values: input.values } : null;
}

/** What the employee typed, cleaned: a blank text is a field left out, a number typed as text is a number. */
export function cleanValues(fields: readonly AgentFormFieldDto[], fixed: Record<string, unknown>, typed: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...fixed };
  for (const field of fields) {
    const value = typed[field.name];
    delete out[field.name];
    if (value === undefined || value === null || value === '') continue;
    const asNumber = field.type === 'number' || field.type === 'integer' || field.numeric;
    out[field.name] = asNumber && typeof value === 'string' ? Number(value) : value;
  }
  return out;
}

/** The mistakes of the form's own rules, by field: mandatory left empty, a choice that is not on offer. */
export function formErrors(fields: readonly AgentFormFieldDto[], values: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field.name];
    if (field.required && value === undefined) errors[field.name] = 'required';
    else if (value !== undefined && field.options && !field.options.some((o) => o.value === String(value))) errors[field.name] = 'invalid_choice';
  }
  return errors;
}

/** One line per filled field for the confirmation card, with the names of choices instead of their ids. */
export function formSummary(label: string, fields: readonly AgentFormFieldDto[], values: Record<string, unknown>): string {
  const lines = fields
    .filter((f) => values[f.name] !== undefined)
    .map((f) => `${f.label}: ${f.options?.find((o) => o.value === String(values[f.name]))?.label ?? (typeof values[f.name] === 'boolean' ? (values[f.name] ? '✓' : '✗') : String(values[f.name]))}`);
  return [label, ...lines].join('\n');
}
