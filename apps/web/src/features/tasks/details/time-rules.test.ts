import { describe, expect, it } from 'vitest';
import { checkTime, DAY_MINUTES } from './time-rules';

describe('Time entry rules (FR-200)', () => {
  it('turns hours and minutes into minutes', () => {
    expect(checkTime('1', '30')).toMatchObject({ total: 90, valid: true });
    expect(checkTime('', '45')).toMatchObject({ total: 45, valid: true });
    expect(checkTime('8', '')).toMatchObject({ total: 480, valid: true });
  });

  it('takes a whole day and not a minute more', () => {
    expect(checkTime('24', '0')).toMatchObject({ total: DAY_MINUTES, valid: true, tooLong: false });
    expect(checkTime('24', '1')).toMatchObject({ valid: false, tooLong: true, hours: 24, minutes: 1 });
    expect(checkTime('33', '20')).toMatchObject({ valid: false, tooLong: true });
    expect(checkTime('2000', '')).toMatchObject({ valid: false, tooLong: true });
  });

  it('says empty for nothing or zero, and invalid for what is not a whole number or minutes above 59', () => {
    expect(checkTime('', '')).toMatchObject({ empty: true, valid: false });
    expect(checkTime('0', '0')).toMatchObject({ empty: true, valid: false });
    expect(checkTime('1.5', '')).toMatchObject({ hoursInvalid: true, valid: false });
    expect(checkTime('-1', '')).toMatchObject({ hoursInvalid: true, valid: false });
    expect(checkTime('1', '60')).toMatchObject({ minutesInvalid: true, valid: false });
    expect(checkTime('', '2.5')).toMatchObject({ minutesInvalid: true, valid: false });
  });
});
