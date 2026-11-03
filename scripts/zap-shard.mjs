#!/usr/bin/env node
// Splits an OpenAPI document into shards so the ZAP API scan runs in parallel CI jobs.
// Paths are grouped by their first tag (else the first path segment after /api), then groups are packed
// into the shards by operation count (largest group first, into the lightest shard), so every path lands in exactly one shard.
// Usage: node scripts/zap-shard.mjs <openapi.json> <shard 1..N> <N> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';

const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

export function groupKey(path, item) {
  const tag = Object.entries(item).find(([method, op]) => HTTP_METHODS.has(method) && op?.tags?.length)?.[1].tags[0];
  if (tag) return tag;
  return path.split('/').filter((part) => part && part !== 'api')[0] ?? '(root)';
}

const operationCount = (item) => Object.keys(item).filter((method) => HTTP_METHODS.has(method)).length;

/** Returns one array of paths per shard. */
export function planShards(paths, shardCount) {
  const groups = new Map();
  for (const [path, item] of Object.entries(paths)) {
    const key = groupKey(path, item);
    const group = groups.get(key) ?? { size: 0, paths: [] };
    group.size += operationCount(item);
    group.paths.push(path);
    groups.set(key, group);
  }
  const shards = Array.from({ length: shardCount }, () => ({ size: 0, paths: [] }));
  const bySize = [...groups.entries()].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]));
  for (const [, group] of bySize) {
    const lightest = shards.reduce((min, shard) => (shard.size < min.size ? shard : min));
    lightest.size += group.size;
    lightest.paths.push(...group.paths);
  }
  return shards.map((shard) => shard.paths);
}

function main() {
  const [file, shardArg, countArg, out] = process.argv.slice(2);
  const shard = Number(shardArg);
  const count = Number(countArg);
  if (!file || !out || !Number.isInteger(shard) || !Number.isInteger(count) || shard < 1 || shard > count) {
    console.error('Usage: node scripts/zap-shard.mjs <openapi.json> <shard 1..N> <N> <out.json>');
    process.exit(2);
  }
  const spec = JSON.parse(readFileSync(file, 'utf8'));
  const mine = new Set(planShards(spec.paths ?? {}, count)[shard - 1]);
  const paths = Object.fromEntries(Object.entries(spec.paths).filter(([path]) => mine.has(path)));
  if (mine.size === 0) {
    console.error(`Shard ${shard}/${count} has no paths: lower the shard count.`);
    process.exit(1);
  }
  writeFileSync(out, JSON.stringify({ ...spec, paths }));
  console.log(`shard ${shard}/${count}: ${mine.size} of ${Object.keys(spec.paths).length} paths`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
