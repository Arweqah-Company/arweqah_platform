import { createEmployeeSchema, idNumberProblem, isLuhnValid, isWorkEmail, matchesIdRule, type IdTypeRules } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';

const NATIONAL = { regex: '^1\\d{9}$', minLength: 10, maxLength: 10, checksum: 'luhn' as const };
const EGYPT = 'country-eg';
const rule = (countryId: string | null, regex: string, label: string) => ({ countryId, regex, minLength: 1, maxLength: 20, messageAr: `ar ${label}`, messageEn: `en ${label}` });

describe('ID number rules (FR-18)', () => {
  it('Luhn: accepts valid Saudi numbers and rejects a single wrong digit', () => {
    for (const ok of ['1012345672', '1087654321', '2087654329']) expect(isLuhnValid(ok), ok).toBe(true);
    for (const bad of ['1071724369', '1087654322', '1012345673', '10123456', 'abc']) expect(isLuhnValid(bad), bad).toBe(false);
  });

  it('a national ID needs 10 digits starting with 1 and a valid check digit', () => {
    expect(matchesIdRule('1087654321', NATIONAL)).toBe(true);
    expect(matchesIdRule('1087654322', NATIONAL)).toBe(false); // checksum
    expect(matchesIdRule('2087654329', NATIONAL)).toBe(false); // starts with 2
    expect(matchesIdRule('108765432', NATIONAL)).toBe(false); // length
  });

  it('uses the rule of the nationality when the type has one, otherwise the rule of the whole type', () => {
    const type: IdTypeRules = { requiresCountry: true, rules: [rule(null, '^[A-Z0-9]{5,20}$', 'generic'), rule(EGYPT, '^[23]\\d{13}$', 'egypt')] };
    expect(idNumberProblem({ idNumber: '29001011234567', nationalityId: EGYPT }, type)).toBeNull();
    expect(idNumberProblem({ idNumber: 'AB12345', nationalityId: EGYPT }, type)).toMatchObject({ path: 'idNumber', messageEn: 'en egypt' });
    expect(idNumberProblem({ idNumber: 'AB12345', nationalityId: 'country-other' }, type)).toBeNull();
    expect(idNumberProblem({ idNumber: 'ab', nationalityId: 'country-other' }, type)).toMatchObject({ messageEn: 'en generic' });
  });

  it('asks for the nationality first when the type depends on it', () => {
    const type: IdTypeRules = { requiresCountry: true, rules: [rule(null, '^.+$', 'generic')] };
    expect(idNumberProblem({ idNumber: '12345', nationalityId: null }, type)).toMatchObject({ path: 'nationalityId' });
  });
});

describe('Work e-mail domain (FR-17)', () => {
  it('ends only with @arweqah.sa (any letter case), and nothing else passes', () => {
    for (const ok of ['a@arweqah.sa', 'A.B@ARWEQAH.SA', 'first-last@arweqah.sa']) expect(isWorkEmail(ok), ok).toBe(true);
    for (const bad of ['a@gmail.com', 'a@sub.arweqah.sa', 'a@arweqah.sa.evil.com', 'a@arweqah.com', 'a@xarweqah.sa', 'arweqah.sa']) expect(isWorkEmail(bad), bad).toBe(false);
  });

  it('the form schema rejects other domains and stores the address in lower case', () => {
    const base = { companyId: crypto.randomUUID(), orgNodeId: crypto.randomUUID(), jobTitleId: crypto.randomUUID(), employeeNumber: 'E1', fullName: 'Test', startDate: '2026-01-01' };
    expect(createEmployeeSchema.safeParse({ ...base, workEmail: 'someone@gmail.com' }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...base, workEmail: 'a@arweqah.sa@gmail.com' }).success).toBe(false);
    const ok = createEmployeeSchema.safeParse({ ...base, workEmail: 'Some.One@Arweqah.SA' });
    expect(ok.success && ok.data.workEmail).toBe('some.one@arweqah.sa');
  });
});
