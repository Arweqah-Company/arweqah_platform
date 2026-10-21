/** Rules shared by the API (final authority) and the web form (early feedback). */

export const WORK_EMAIL_DOMAIN = 'arweqah.sa';
export const MIN_EMPLOYEE_AGE = 18;
export const MAX_EMPLOYEE_AGE = 70;

const E164 = /^\+[1-9]\d{6,14}$/;
const ENGLISH_NAME = /^[A-Za-z][A-Za-z '-]*$/;
const DOUBLE_SEPARATOR = /[ '-]{2}/;

export const isWorkEmail = (email: string): boolean => email.toLowerCase().endsWith(`@${WORK_EMAIL_DOMAIN}`);
export const isE164Phone = (phone: string): boolean => E164.test(phone);
/** English letters and spaces (a hyphen or apostrophe inside a name is allowed), no doubled separators. */
export const isEnglishName = (name: string): boolean => ENGLISH_NAME.test(name) && !DOUBLE_SEPARATOR.test(name);

/** Saudi IBAN: "SA" + 22 digits, ISO 7064 mod-97 check. Input is normalized first (no spaces, uppercase). */
export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

export function isValidSaudiIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!/^SA\d{22}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let remainder = 0;
  for (const ch of digits) remainder = (remainder * 10 + Number(ch)) % 97;
  return remainder === 1;
}

/** Whole years between an ISO date (YYYY-MM-DD) and a reference date. */
export function yearsBetween(isoDate: string, reference: Date = new Date()): number {
  const born = new Date(`${isoDate}T00:00:00Z`);
  let years = reference.getUTCFullYear() - born.getUTCFullYear();
  const beforeBirthday =
    reference.getUTCMonth() < born.getUTCMonth() ||
    (reference.getUTCMonth() === born.getUTCMonth() && reference.getUTCDate() < born.getUTCDate());
  if (beforeBirthday) years -= 1;
  return years;
}

export const addYears = (isoDate: string, years: number): string => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
};

export const todayIso = (now: Date = new Date()): string => now.toISOString().slice(0, 10);

/** Checks a document number against the rule of its type (and nationality when the type needs it). */
export interface IdRule {
  regex: string;
  minLength: number;
  maxLength: number;
}

export function matchesIdRule(value: string, rule: IdRule): boolean {
  if (value.length < rule.minLength || value.length > rule.maxLength) return false;
  try {
    // The pattern comes from the seeded id_type_rules table (reviewed data), never from a request.
    // eslint-disable-next-line security/detect-non-literal-regexp
    return new RegExp(rule.regex).test(value);
  } catch {
    return false;
  }
}
