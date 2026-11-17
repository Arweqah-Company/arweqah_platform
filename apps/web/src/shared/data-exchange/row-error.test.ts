import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/core/api/api-client';
import { rowErrorMessage } from './row-error';
import type { ImportColumn } from './types';

const t = ((key: string, o?: { defaultValue?: string }) => o?.defaultValue ?? key) as unknown as TFunction;
const columns: ImportColumn[] = [
  { id: 'idNumber', header: 'رقم الهوية' },
  { id: 'workEmail', header: 'البريد' },
];

describe('Import: a row the server refuses names its column (FR-28)', () => {
  it('names the column of a validation issue', () => {
    const error = new ApiError(400, 'VALIDATION', 'Invalid request', [{ path: ['workEmail'], message: 'Invalid e-mail' }]);
    expect(rowErrorMessage(t, error, columns, 'ar')).toBe('البريد: Invalid e-mail');
  });

  it('names the column of a business rule in the language of the person', () => {
    const error = new ApiError(422, 'FIELD_RULE', 'x', { path: 'idNumber', messageAr: 'رقم غير صحيح', messageEn: 'Bad number' });
    expect(rowErrorMessage(t, error, columns, 'ar')).toBe('رقم الهوية: رقم غير صحيح');
    expect(rowErrorMessage(t, error, columns, 'en')).toBe('رقم الهوية: Bad number');
  });

  it('keeps the plain message when no column is named', () => {
    expect(rowErrorMessage(t, new ApiError(409, 'EMPLOYEE_EMAIL_TAKEN', 'taken'), columns, 'en')).toBe('taken');
  });
});

describe('Import: a conflict names its column', () => {
  it('leads a duplicate with the column', () => {
    const error = new ApiError(409, 'EMPLOYEE_EMAIL_TAKEN', 'taken', { path: 'workEmail' });
    expect(rowErrorMessage(t, error, columns, 'en')).toBe('البريد: taken');
  });
});
