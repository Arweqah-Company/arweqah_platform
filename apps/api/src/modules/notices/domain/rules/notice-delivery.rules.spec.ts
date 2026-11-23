import { describe, expect, it } from 'vitest';
import { ackStateOf, batchCount, batchOffset, deliveryEstimate, hasNextBatch, myStateOf, publishInstant } from './notice-delivery.rules';

describe('Delivery in batches (FR-168, FR-175)', () => {
  it('counts the batches and finds where each starts', () => {
    expect(batchCount(0, 500)).toBe(0);
    expect(batchCount(1240, 500)).toBe(3);
    expect(batchCount(1500, 500)).toBe(3);
    expect(batchOffset(1, 500)).toBe(0);
    expect(batchOffset(3, 500)).toBe(1000);
    expect(hasNextBatch(2, 500, 1240)).toBe(true);
    expect(hasNextBatch(3, 500, 1240)).toBe(false);
    expect(hasNextBatch(3, 500, 1500)).toBe(false);
  });

  it('tells how long an audience takes (the first batch goes at once)', () => {
    expect(deliveryEstimate(1240, 500, 5)).toEqual({ batches: 3, minutes: 10 });
    expect(deliveryEstimate(10, 500, 5)).toEqual({ batches: 1, minutes: 0 });
    expect(deliveryEstimate(0, 500, 5)).toEqual({ batches: 0, minutes: 0 });
  });

  it('publishes at the start of the day in Riyadh (21:00 UTC the day before)', () => {
    expect(publishInstant('2026-12-01').toISOString()).toBe('2026-11-30T21:00:00.000Z');
  });

  it('says where a person stands: an announcement informs, a policy waits for the current version', () => {
    expect(myStateOf('announcement', null, 1)).toBe('info');
    expect(myStateOf('policy', null, 1)).toBe('await');
    expect(myStateOf('policy', 1, 2)).toBe('await');
    expect(myStateOf('policy', 2, 2)).toBe('done');
  });

  it('files each recipient of the report', () => {
    expect(ackStateOf({ acknowledgedVersion: 2, joinedAfterPublish: false }, 2)).toBe('acknowledged');
    expect(ackStateOf({ acknowledgedVersion: 1, joinedAfterPublish: false }, 2)).toBe('older_version');
    expect(ackStateOf({ acknowledgedVersion: null, joinedAfterPublish: false }, 2)).toBe('pending');
    expect(ackStateOf({ acknowledgedVersion: null, joinedAfterPublish: true }, 2)).toBe('joined_later');
    expect(ackStateOf({ acknowledgedVersion: 2, joinedAfterPublish: true }, 2)).toBe('acknowledged');
  });
});
