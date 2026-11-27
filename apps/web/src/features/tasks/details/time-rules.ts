/** A day has 24 hours: the API refuses one time entry above it (`timeEntrySchema`), so the screen says so before sending. */
export const DAY_MINUTES = 1440;

const WHOLE = /^\d+$/;
const isBlank = (value: string): boolean => value.trim() === '';
const whole = (value: string): number => (isBlank(value) ? 0 : Number(value.trim()));

export interface TimeCheck {
  /** Hours and minutes as one number of minutes (only meaningful when `valid`). */
  total: number;
  /** The hours box holds something that is not a whole number. */
  hoursInvalid: boolean;
  /** The minutes box holds something that is not a whole number from 0 to 59. */
  minutesInvalid: boolean;
  /** Nothing was written, or zero. */
  empty: boolean;
  /** More than a day: the two boxes together are over 24 hours. */
  tooLong: boolean;
  /** What was typed, for the message. */
  hours: number;
  minutes: number;
  valid: boolean;
}

const hoursBad = (text: string): boolean => !isBlank(text) && !WHOLE.test(text.trim());
const minutesBad = (text: string): boolean => !isBlank(text) && (!WHOLE.test(text.trim()) || whole(text) > 59);

/** Checks the hours and minutes boxes together; a blank box counts as zero as long as the other one holds a value. */
export function checkTime(hoursText: string, minutesText: string): TimeCheck {
  const hoursInvalid = hoursBad(hoursText);
  const minutesInvalid = minutesBad(minutesText);
  const sound = !hoursInvalid && !minutesInvalid;
  const hours = hoursInvalid ? 0 : whole(hoursText);
  const minutes = minutesInvalid ? 0 : whole(minutesText);
  const total = hours * 60 + minutes;
  const empty = sound && total === 0;
  const tooLong = sound && total > DAY_MINUTES;
  return { total, hoursInvalid, minutesInvalid, empty, tooLong, hours, minutes, valid: sound && !empty && !tooLong };
}
