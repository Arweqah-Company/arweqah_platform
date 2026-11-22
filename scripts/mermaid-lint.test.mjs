import assert from 'node:assert/strict';
import { test } from 'node:test';
import { badMessageLines, semicolonInMessage } from './mermaid-lint.mjs';

test('every message arrow type is checked', () => {
  for (const arrow of ['->>', '-->>', '->', '-->', '-x', '--x', '-)', '--)', '->>+', '-->>-']) {
    assert.equal(semicolonInMessage(`  A${arrow}B: Denied; retry later`), true, arrow);
    assert.equal(semicolonInMessage(`  A${arrow}B: Denied, retry later`), false, arrow);
  }
});

test('a line that is not a message is left alone', () => {
  for (const line of ['  participant A as Admin; on', '  Note over A,B: waits; then goes', '  alt a; b', '  A->>B: ok']) assert.equal(semicolonInMessage(line), false, line);
});

test('only sequence diagrams inside a mermaid block are read', () => {
  const md = ['text A->>B: x; y', '```mermaid', 'flowchart LR', '  A-->B: x; y', '```', '```mermaid', 'sequenceDiagram', '  A->>B: fine', '  B--xA: no; good', '```', '  A->>B: x; y'].join('\n');
  assert.deepEqual(badMessageLines(md), [9]);
});
