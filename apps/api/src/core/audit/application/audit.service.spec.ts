import { describe, expect, it } from 'vitest';
import { safeName } from '../../files/application/files.service';
import type { AuditLogRepository } from '../domain/audit-log.repository';
import { AuditService, redact } from './audit.service';
import { impersonationStamp } from './impersonation-stamp';

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

describe('audit entries written while signed in as another employee (FR-85)', () => {
  const recorded = async (run: <T>(work: () => Promise<T>) => Promise<T>): Promise<Record<string, unknown> | null> => {
    let saved: Record<string, unknown> | null = null;
    const service = new AuditService({ append: async (row: { changes: Record<string, unknown> | null }) => { saved = row.changes; } } as unknown as AuditLogRepository);
    await run(() => service.record({ actorId: 'employee', action: 'task.created', entityType: 'task', changes: { title: 'x' } }));
    return saved;
  };

  it('names the administrator inside the changes, next to what changed', async () => {
    expect(await recorded((work) => impersonationStamp.run({ impersonatedBy: 'admin-id' }, work))).toEqual({ title: 'x', impersonatedBy: 'admin-id' });
  });

  it('adds nothing for a normal request', async () => {
    expect(await recorded((work) => work())).toEqual({ title: 'x' });
  });
});
