import type { MeDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';
import { RequireAuth } from '../auth/session';
import { ImpersonateAction } from './impersonate-action';
import { ImpersonationBar } from './impersonation-bar';

const START = { key: 'impersonation.start', scope: 'all' as const };

/** The session as the server reports it: an administrator in admin mode, with the feature on or off. */
function serve(over: Partial<MeDto> = {}, permissions = [START]) {
  server.use(http.get('*/api/me', () => HttpResponse.json({ ...me(permissions, { adminMode: true }), id: 'admin', impersonationEnabled: true, ...over })));
}
const action = (userId = 'u2', isActive = true) => renderRoute([{ path: '/', element: <ImpersonateAction as="row" userId={userId} name="سارة" isActive={isActive} /> }], '/');

describe('Sign in as (FR-85)', () => {
  it('shows the icon to an administrator in admin mode while the feature is on', async () => {
    serve();
    action();
    expect(await screen.findByRole('button', { name: 'الدخول بحساب هذا الموظف' })).toBeInTheDocument();
  });

  it.each([
    { why: 'the feature is off', over: { impersonationEnabled: false } },
    { why: 'admin mode is off', over: { adminMode: { available: true, active: false, expiresAt: null } } },
    { why: 'the key is missing', over: {}, permissions: [] },
    { why: 'it is the person themselves', over: {}, userId: 'admin' },
    { why: 'the account is not active', over: {}, isActive: false },
    { why: 'already working as someone else', over: { impersonation: { by: { id: 'a', name: 'م' }, startedAt: new Date().toISOString(), idleMinutes: 30 } } },
  ] as { why: string; over: Partial<MeDto>; permissions?: (typeof START)[]; userId?: string; isActive?: boolean }[])('is hidden when $why', async ({ over, permissions = [START], userId = 'u2', isActive = true }) => {
    serve(over, permissions);
    action(userId, isActive);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'الدخول بحساب هذا الموظف' })).not.toBeInTheDocument());
  });

  it('asks first, then starts it for that person', async () => {
    serve();
    let started = '';
    server.use(http.post('*/api/impersonation/:userId', ({ params }) => { started = String(params.userId); return new HttpResponse(null, { status: 204 }); }));
    action();
    fireEvent.click(await screen.findByRole('button', { name: 'الدخول بحساب هذا الموظف' }));
    expect(await screen.findByText('الدخول بحساب سارة؟')).toBeInTheDocument();
    expect(started).toBe('');
    fireEvent.click(screen.getAllByRole('button', { name: 'الدخول بحساب هذا الموظف' }).at(-1) as HTMLElement);
    await waitFor(() => expect(started).toBe('u2'));
  });

  it('shows the bar with the two names and the way back only inside such a session', async () => {
    serve({ name: 'سارة', impersonation: { by: { id: 'a', name: 'خالد المدير' }, startedAt: new Date().toISOString(), idleMinutes: 30 } });
    let stopped = false;
    server.use(http.post('*/api/impersonation/stop', () => { stopped = true; return new HttpResponse(null, { status: 204 }); }));
    renderRoute([{ path: '/', element: <ImpersonationBar /> }], '/');
    expect(await screen.findByText('أنت تعمل الآن بحساب سارة — دخول بواسطة خالد المدير.')).toBeInTheDocument();
    expect(screen.getByText('ينتهي من تلقاء نفسه بعد 30 دقيقة بلا نشاط.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'العودة لحسابي' }));
    await waitFor(() => expect(stopped).toBe(true));
  });

  it('shows no bar for a normal sign-in', async () => {
    serve();
    renderRoute([{ path: '/', element: <ImpersonationBar /> }], '/');
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('does not send the administrator to link an authenticator app for an employee who has none', async () => {
    serve({ authenticatorEnabled: false, impersonation: { by: { id: 'a', name: 'م' }, startedAt: new Date().toISOString(), idleMinutes: 30 } });
    renderRoute([{ path: '/', element: <RequireAuth><p>الصفحة الرئيسية</p></RequireAuth> }, { path: '/enroll', element: <p>ربط التطبيق</p> }], '/');
    expect(await screen.findByText('الصفحة الرئيسية')).toBeInTheDocument();
    expect(screen.queryByText('ربط التطبيق')).not.toBeInTheDocument();
  });
});
