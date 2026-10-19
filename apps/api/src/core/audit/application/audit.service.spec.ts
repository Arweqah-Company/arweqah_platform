import { describe, expect, it } from 'vitest';
import { safeName } from '../../files/application/files.service';
import { redact } from './audit.service';

describe('redact', () => {
  it('removes secrets and national IDs from audit changes', () => {
    expect(redact({ password: 'x', nationalId: '1', national_id: '2', accessToken: 't', email: 'a@b.c' }))
      .toEqual({ password: '[redacted]', nationalId: '[redacted]', national_id: '[redacted]', accessToken: '[redacted]', email: 'a@b.c' });
  });
});

describe('safeName', () => {
  it.each([
    ['../../etc/passwd', 'passwd'],
    ['C:\\temp\\cv.pdf', 'cv.pdf'],
    ['bad<>name.pdf', 'badname.pdf'],
    ['', 'file'],
  ])('%s → %s', (input, expected) => expect(safeName(input)).toBe(expected));
});
