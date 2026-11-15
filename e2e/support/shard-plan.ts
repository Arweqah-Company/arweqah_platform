import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/** `2/4` → `{ current: 2, total: 4 }`; nothing (or anything else) is not a shard. */
export function parseShard(value: string | undefined): { current: number; total: number } | null {
  const match = /^(\d+)\/(\d+)$/.exec(value ?? '');
  if (!match) return null;
  const [current, total] = [Number(match[1]), Number(match[2])];
  return current >= 1 && current <= total ? { current, total } : null;
}

/** Seconds each spec file took last time (`shard-weights.json`). */
export const readWeights = (file: string): Record<string, number> => JSON.parse(readFileSync(file, 'utf8')) as Record<string, number>;

/** Every `*.spec.ts` under `dir`, as paths relative to it, sorted. */
export function specFiles(dir: string): string[] {
  const found: string[] = [];
  const walk = (folder: string): void => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(folder, entry.name));
      else if (entry.name.endsWith('.spec.ts')) found.push(relative(dir, join(folder, entry.name)).split('\\').join('/'));
    }
  };
  walk(dir);
  return found.sort();
}

/**
 * Splits the spec files over `total` runners so that the slowest runner is as quick as possible (longest file first, onto the lightest runner).
 * `weights` is the seconds a file took last time; a file it does not know (a new one) weighs the median, so it is neither free nor a giant.
 * Every file lands on exactly one runner, so splitting never drops a test.
 */
export function planShards(files: string[], weights: Record<string, number>, total: number): string[][] {
  const known = Object.values(weights).sort((a, b) => a - b);
  const median = known.length ? (known[Math.floor(known.length / 2)] as number) : 1;
  const weightOf = (file: string): number => weights[file] ?? median;
  const shards = Array.from({ length: total }, () => ({ load: 0, files: [] as string[] }));
  for (const file of [...files].sort((a, b) => weightOf(b) - weightOf(a) || a.localeCompare(b))) {
    const lightest = shards.reduce((best, s) => (s.load < best.load ? s : best));
    lightest.files.push(file);
    lightest.load += weightOf(file);
  }
  return shards.map((s) => s.files.sort());
}
