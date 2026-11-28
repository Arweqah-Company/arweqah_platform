import { riyadhToday } from '@arweqah-platform/shared';

export const DAY = 86_400_000;
/** The Riyadh day `n` days from now (negative = past). */
export const daysFromNow = (n: number): string => riyadhToday(new Date(Date.now() + n * DAY));
