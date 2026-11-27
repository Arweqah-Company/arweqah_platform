import { Injectable } from '@nestjs/common';

const HOUR_MS = 3_600_000;

/** How many AI analyses one person asked for in the last hour (kept in memory: an analysis writes nothing, so it needs no table; a restart forgets the count). */
@Injectable()
export class ProblemReportThrottle {
  private readonly asked = new Map<string, number[]>();

  /** Counts this request and says whether the person is still within `max` an hour. */
  allow(userId: string, max: number, now: Date): boolean {
    const since = now.getTime() - HOUR_MS;
    const recent = (this.asked.get(userId) ?? []).filter((at) => at > since);
    if (recent.length >= max) {
      this.asked.set(userId, recent);
      return false;
    }
    this.asked.set(userId, [...recent, now.getTime()]);
    return true;
  }
}
