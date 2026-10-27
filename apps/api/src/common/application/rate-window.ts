/** Sliding window counter kept in memory: at most `limit` turns per key within `windowMs`. */
export class RateWindow {
  private readonly turns = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Records a turn and answers true, or answers false (without recording) when the key used all of its turns. */
  take(key: string, now = Date.now()): boolean {
    const inWindow = (this.turns.get(key) ?? []).filter((at) => now - at < this.windowMs);
    if (inWindow.length >= this.limit) {
      this.turns.set(key, inWindow);
      return false;
    }
    this.turns.set(key, [...inWindow, now]);
    return true;
  }
}
