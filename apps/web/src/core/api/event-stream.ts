/** One event of a Server-Sent Events answer. */
export interface StreamEvent {
  event: string;
  data: unknown;
}

/** The complete events in the text read so far, and what is left of an event that has not ended yet. */
export function parseEvents(buffer: string): { events: StreamEvent[]; rest: string } {
  const blocks = buffer.split('\n\n');
  const rest = blocks.pop() ?? '';
  const events = blocks.flatMap((block) => {
    const name = /^event: (.+)$/m.exec(block)?.[1];
    const data = /^data: (.+)$/m.exec(block)?.[1];
    if (!name || data === undefined) return [];
    try {
      return [{ event: name, data: JSON.parse(data) as unknown }];
    } catch {
      return [];
    }
  });
  return { events, rest };
}
