import { createHash } from 'node:crypto';

/** The parts of an entry that its hash covers. */
export interface ChainedEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ip: string | null;
  createdAt: Date;
}

/** JSON with the keys of every object sorted, so the same data always gives the same text (a jsonb column does not keep the order it was given). */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

/** The hash of an entry given the hash of the one before it: changing, removing or reordering any earlier entry changes every hash after it. */
export function chainHash(previous: string | null, entry: ChainedEntry): string {
  const body = canonicalJson([previous ?? '', entry.id, entry.actorId, entry.action, entry.entityType, entry.entityId, entry.changes, entry.ip, entry.createdAt.toISOString()]);
  return createHash('sha256').update(body).digest('hex');
}

export interface ChainCheck {
  /** Entries that carry a hash and were checked. */
  checked: number;
  ok: boolean;
  /** The position (seq) of the first entry that does not match, or null. */
  brokenAtSeq: string | null;
}

/** Checks rows in order: each must point at the hash before it and hash to what it says. The first row only has to hash right (it starts the chain). */
export function verifyChain(rows: (ChainedEntry & { seq: string; prevHash: string | null; hash: string })[]): ChainCheck {
  let previous: string | null = null;
  for (const [index, row] of rows.entries()) {
    const linked = index === 0 || row.prevHash === previous;
    if (!linked || chainHash(row.prevHash, row) !== row.hash) return { checked: index, ok: false, brokenAtSeq: row.seq };
    previous = row.hash;
  }
  return { checked: rows.length, ok: true, brokenAtSeq: null };
}
