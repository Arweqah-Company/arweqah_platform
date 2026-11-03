import { describe, expect, it } from 'vitest';
import type { EmployeeInput, RuleLookups } from './employee-flags.rules';
import { applyFlagRules } from './employee-flags.rules';

const base = {
  companyId: 'c', orgNodeId: 'n', jobTitleId: 't', workEmail: 'a@arweqah.sa', employeeNumber: '1', fullName: 'Sara', startDate: '2026-01-01',
  isGosiRegistered: false, isQiwaContract: false, hasMedicalInsurance: false,
} as EmployeeInput;

const none: RuleLookups = { contractType: null, idType: null, terminationReasonIsOther: null, relationLimited: null };

describe('applyFlagRules (FR-17, FR-18)', () => {
  it('requires an end date when the contract type asks for one', () => {
    const lookups = { ...none, contractType: { requiresEndDate: true, isOther: false } };
    expect(() => applyFlagRules({ ...base, contractTypeId: 'ct' }, lookups)).toThrow(/End date/);
    expect(() => applyFlagRules({ ...base, contractTypeId: 'ct', endDate: '2027-01-01' }, lookups)).not.toThrow();
  });

  it('requires the free text for an "other" contract type and drops it otherwise', () => {
    const other = { ...none, contractType: { requiresEndDate: false, isOther: true } };
    expect(() => applyFlagRules({ ...base, contractTypeId: 'ct' }, other)).toThrow(/Describe/);
    expect(applyFlagRules({ ...base, contractTypeId: 'ct', contractTypeOther: 'Seasonal' }, other).contractTypeOther).toBe('Seasonal');
    const plain = { ...none, contractType: { requiresEndDate: false, isOther: false } };
    expect(applyFlagRules({ ...base, contractTypeId: 'ct', contractTypeOther: 'ignored' }, plain).contractTypeOther).toBeNull();
  });

  it('saves hidden GOSI and health-insurance fields as null even when they are sent', () => {
    const result = applyFlagRules({ ...base, gosiCompanyId: 'g', gosiRegistrationDate: '2026-02-01', gosiSystemId: 's', healthInsuranceCompanyId: 'h' }, none);
    expect([result.gosiCompanyId, result.gosiRegistrationDate, result.gosiSystemId, result.healthInsuranceCompanyId]).toEqual([null, null, null, null]);
    const kept = applyFlagRules({ ...base, isGosiRegistered: true, hasMedicalInsurance: true, gosiCompanyId: 'g', gosiRegistrationDate: '2026-02-01', gosiSystemId: 's', healthInsuranceCompanyId: 'h' }, none);
    expect([kept.gosiCompanyId, kept.gosiSystemId, kept.healthInsuranceCompanyId]).toEqual(['g', 's', 'h']);
  });

  it('checks the ID number against the rule of its type, and of the nationality when the type needs it', () => {
    const national = { ...none, idType: { requiresCountry: false, rules: [{ countryId: null, regex: '^1\\d{9}$', minLength: 10, maxLength: 10, messageAr: 'م', messageEn: 'National ID must be 10 digits starting with 1' }] } };
    expect(() => applyFlagRules({ ...base, idTypeId: 'i', idNumber: '2123456789' }, national)).toThrow(/National ID/);
    expect(() => applyFlagRules({ ...base, idTypeId: 'i', idNumber: '1123456789' }, national)).not.toThrow();
    const home = { ...none, idType: { requiresCountry: true, rules: [{ countryId: 'eg', regex: '^\\d{14}$', minLength: 14, maxLength: 14, messageAr: 'م', messageEn: 'Egyptian ID is 14 digits' }] } };
    expect(() => applyFlagRules({ ...base, idTypeId: 'i', idNumber: '123' }, home)).toThrow(/Nationality/);
    expect(() => applyFlagRules({ ...base, idTypeId: 'i', idNumber: '123', nationalityId: 'eg' }, home)).toThrow(/Egyptian/);
    expect(() => applyFlagRules({ ...base, idTypeId: 'i', idNumber: '12345678901234', nationalityId: 'eg' }, home)).not.toThrow();
  });

  it('requires the text of an "other" termination reason', () => {
    const lookups = { ...none, terminationReasonIsOther: true };
    expect(() => applyFlagRules({ ...base, terminationReasonId: 'r', endDate: '2027-01-01' }, lookups)).toThrow(/reason/);
  });
});

describe('Collaborator end date (FR-79)', () => {
  const input = { ...base, endDate: null };
  it('a relation with limited access needs the end date; an ordinary one does not', () => {
    expect(() => applyFlagRules(input, { ...none, relationLimited: true })).toThrow(/end date of the contract/);
    expect(() => applyFlagRules(input, { ...none, relationLimited: false })).not.toThrow();
  });
});
