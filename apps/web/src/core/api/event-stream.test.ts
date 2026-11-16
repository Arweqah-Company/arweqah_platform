import { describe, expect, it } from 'vitest';
import { parseEvents } from './event-stream';

describe('Reading a stream of events (FR-149)', () => {
  it('gives the complete events and keeps what is left of the one still arriving', () => {
    const first = parseEvents('event: status\ndata: {"code":"thinking"}\n\nevent: text\ndata: {"delta":"مر');
    expect(first.events).toEqual([{ event: 'status', data: { code: 'thinking' } }]);
    const second = parseEvents(`${first.rest}حبا"}\n\n`);
    expect(second).toEqual({ events: [{ event: 'text', data: { delta: 'مرحبا' } }], rest: '' });
  });

  it('skips a block without a name or with data that is not JSON', () => {
    expect(parseEvents('data: {"a":1}\n\nevent: x\ndata: nope\n\nevent: y\ndata: 2\n\n').events).toEqual([{ event: 'y', data: 2 }]);
  });
});
