import { describe, expect, it } from 'vitest';
import { impersonationIdle, isForbiddenWhileImpersonating } from './impersonation.rules';

describe('Sign in as: rules (FR-85)', () => {
  it('refuses what must stay with the person, with or without the /api prefix and a trailing slash', () => {
    const refused: [string, string][] = [
      ['POST', '/api/admin-mode/activate'],
      ['POST', '/api/impersonation/3f2b4c1e-0000-4000-8000-000000000000'],
      ['POST', '/api/mfa/enroll'],
      ['POST', '/api/mfa/enroll/confirm'],
      ['DELETE', '/api/me/sessions'],
      ['DELETE', '/api/me/sessions/abc'],
      ['DELETE', '/api/me/trusted-devices/abc'],
      ['PUT', '/api/me/profile'],
      ['PUT', '/api/employees/abc/roles'],
      ['POST', '/api/employees/abc/reset-authenticator/'],
      ['POST', '/api/employees/abc/terminate'],
      ['PUT', '/api/roles/abc'],
      ['PUT', '/api/permission-targets/user/abc'],
      ['PUT', '/api/security-settings'],
      ['DELETE', '/api/access/exceptions/team/a/b'],
    ];
    for (const [method, path] of refused) expect(isForbiddenWhileImpersonating(method, path), `${method} ${path}`).toBe(true);
  });

  it('leaves reading and the everyday work open, and going back', () => {
    const open: [string, string][] = [
      ['GET', '/api/me'],
      ['GET', '/api/roles'],
      ['GET', '/api/security-settings'],
      ['GET', '/api/me/sessions'],
      ['POST', '/api/impersonation/stop'],
      ['POST', '/api/tasks'],
      ['PUT', '/api/employees/abc'],
      ['POST', '/api/tickets'],
    ];
    for (const [method, path] of open) expect(isForbiddenWhileImpersonating(method, path), `${method} ${path}`).toBe(false);
  });

  it('runs out after the idle minutes, never when there is no last activity', () => {
    const now = new Date('2026-11-03T10:00:00Z');
    expect(impersonationIdle('2026-11-03T09:29:00Z', 30, now)).toBe(true);
    expect(impersonationIdle('2026-11-03T09:31:00Z', 30, now)).toBe(false);
    expect(impersonationIdle('2026-11-03T09:29:59Z', 30, now)).toBe(true);
    expect(impersonationIdle(null, 30, now)).toBe(false);
  });
});
