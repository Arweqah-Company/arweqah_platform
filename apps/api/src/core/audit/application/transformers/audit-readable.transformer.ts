import { auditKeyLabel, type AuditDetailDto, type AuditText } from '@arweqah-platform/shared';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YES: AuditText = { ar: 'نعم', en: 'Yes' };
const NO: AuditText = { ar: 'لا', en: 'No' };
const HIDDEN: AuditText = { ar: 'مخفي', en: 'Hidden' };
const NONE: AuditText = { ar: '—', en: '—' };

/** An entry's `entityId` can be any text (a domain, a file name…): only a real id can be looked up. */
export const isId = (value: string): boolean => UUID.test(value);

/** Every id found in an entry's changes (a value, or inside a list), so one query can name them all. */
export function idsIn(changes: Record<string, unknown> | null): string[] {
  const found: string[] = [];
  for (const value of Object.values(changes ?? {})) for (const item of Array.isArray(value) ? value : [value]) if (typeof item === 'string' && UUID.test(item)) found.push(item);
  return found;
}

type Names = ReadonlyMap<string, AuditText>;

/** A text value: the name behind an id, the label of a changed detail (in the `fields` list), or the text itself. */
function text(key: string, value: string, names: Names): AuditText {
  if (value === '[redacted]') return HIDDEN;
  if (UUID.test(value)) return names.get(value) ?? { ar: value, en: value };
  return key === 'fields' ? auditKeyLabel(value) : { ar: value, en: value };
}

/** One value in words: a name for an id, the label of a changed detail, yes / no, the text, or the JSON of anything else. */
function word(key: string, value: unknown, names: Names): AuditText {
  if (value === null || value === undefined || value === '') return NONE;
  if (typeof value === 'boolean') return value ? YES : NO;
  if (typeof value === 'string') return text(key, value, names);
  const shown = typeof value === 'number' ? String(value) : JSON.stringify(value);
  return { ar: shown, en: shown };
}

/** The changes of an entry as a list a person reads: a label for every key and a name for every id; lists are joined. */
export function readable(changes: Record<string, unknown> | null, names: Names): AuditDetailDto[] | null {
  if (!changes) return null;
  return Object.entries(changes).map(([key, value]) => {
    const parts = (Array.isArray(value) ? value : [value]).map((item) => word(key, item, names));
    return { label: auditKeyLabel(key), value: { ar: parts.map((p) => p.ar).join('، ') || NONE.ar, en: parts.map((p) => p.en).join(', ') || NONE.en } };
  });
}
