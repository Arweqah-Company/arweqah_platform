/** Sliding window counter kept in memory: at most `limit` turns per key within `windowMs`. */
export class RateWindow {
  private readonly turns = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Records a turn and answers true, or answers false (without recording) when the key used all of its turns. */
  take(key: string, now = Date.now(), limit = this.limit): boolean {
    const inWindow = (this.turns.get(key) ?? []).filter((at) => now - at < this.windowMs);
    if (inWindow.length >= limit) {
      this.turns.set(key, inWindow);
      return false;
    }
    this.turns.set(key, [...inWindow, now]);
    return true;
  }

  /** Gives back the last turn of the key (the work it was taken for did not happen). */
  refund(key: string): void {
    const turns = this.turns.get(key);
    if (turns?.length) this.turns.set(key, turns.slice(0, -1));
  }

  /** Forgets the keys that have no turn left in the window, so the map does not grow with every address ever seen. */
  prune(now = Date.now()): void {
    for (const [key, turns] of this.turns) if (!turns.some((at) => now - at < this.windowMs)) this.turns.delete(key);
  }

  get size(): number {
    return this.turns.size;
  }
}
