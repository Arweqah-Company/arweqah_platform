import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseShard, planShards, readWeights, specFiles } from './shard-plan.ts';

const TESTS = new URL('../tests', import.meta.url).pathname;
const weights = readWeights(new URL('../shard-weights.json', import.meta.url).pathname);

test('reads a shard such as 2/4 and ignores anything else', () => {
  assert.deepEqual(parseShard('2/4'), { current: 2, total: 4 });
  for (const bad of [undefined, '', '0/4', '5/4', 'a/b', '2']) assert.equal(parseShard(bad), null);
});

test('puts every spec file on exactly one runner, so splitting never drops a test', () => {
  const files = specFiles(TESTS);
  const planned = planShards(files, weights, 4).flat();
  assert.deepEqual([...planned].sort(), files);
  assert.equal(new Set(planned).size, planned.length);
});

test('balances the runners: the slowest takes at most a third more than the average (known weights)', () => {
  const files = specFiles(TESTS);
  const loads = planShards(files, weights, 4).map((shard) => shard.reduce((sum, f) => sum + ((weights)[f] ?? 0), 0));
  const average = loads.reduce((a, b) => a + b, 0) / loads.length;
  assert.ok(Math.max(...loads) <= average * 1.33, `loads ${loads.join(', ')}`);
});

test('a file with no recorded weight gets the median and still lands somewhere', () => {
  const plan = planShards(['a.spec.ts', 'b.spec.ts', 'new.spec.ts'], { 'a.spec.ts': 10, 'b.spec.ts': 30 }, 2);
  assert.deepEqual(plan.flat().sort(), ['a.spec.ts', 'b.spec.ts', 'new.spec.ts']);
});
