/** How many delivery batches an audience of `total` people needs. */
export const batchCount = (total: number, batchSize: number): number => (total <= 0 ? 0 : Math.ceil(total / batchSize));

/** Is there a batch after this one (batches are numbered from 1)? */
export const hasNextBatch = (batchNo: number, batchSize: number, total: number): boolean => batchNo * batchSize < total;

/** The first row of a batch among the audience in its fixed order. */
export const batchOffset = (batchNo: number, batchSize: number): number => (batchNo - 1) * batchSize;

/** «An audience of N people reaches them in X batches over Y minutes» (the live line of the settings card): the first batch goes at once. */
export function deliveryEstimate(total: number, batchSize: number, intervalMinutes: number): { batches: number; minutes: number } {
  const batches = batchCount(total, batchSize);
  return { batches, minutes: Math.max(0, batches - 1) * intervalMinutes };
}

/** A notice of a given publish date goes out at the start of that day in Riyadh (00:00 +03:00). */
export const publishInstant = (publishOn: string): Date => new Date(`${publishOn}T00:00:00+03:00`);

/** The state of one person's notice: an announcement only informs; a policy waits until the current version is acknowledged. */
export function myStateOf(kind: string, acknowledgedVersion: number | null, currentVersion: number): 'await' | 'done' | 'info' {
  if (kind !== 'policy') return 'info';
  return acknowledgedVersion !== null && acknowledgedVersion >= currentVersion ? 'done' : 'await';
}

/** Which acknowledgement column of the report a recipient falls in. */
export function ackStateOf(r: { acknowledgedVersion: number | null; joinedAfterPublish: boolean }, currentVersion: number): 'acknowledged' | 'older_version' | 'pending' | 'joined_later' {
  if (r.acknowledgedVersion !== null && r.acknowledgedVersion >= currentVersion) return 'acknowledged';
  if (r.acknowledgedVersion !== null) return 'older_version';
  return r.joinedAfterPublish ? 'joined_later' : 'pending';
}
