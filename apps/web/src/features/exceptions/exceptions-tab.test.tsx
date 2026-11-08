import type { AccessExceptionDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { daysLeft } from './exceptions-list';
import { ExceptionsTab } from './exceptions-tab';

/** A day counted by the clock of the browser, which is the one the screen counts the days left by. */
const day = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const row = (over: Partial<AccessExceptionDto>): AccessExceptionDto => ({
  kind: 'role', userId: 'u1', userName: 'سارة أحمد', targetId: 'r1', targetNameAr: 'مشرف', targetNameEn: 'Supervisor', scope: null,
  grantedById: 'g1', grantedByName: 'خالد المدير', grantedAt: '2026-10-01T10:00:00', expiresAt: null, ...over,
});
const ROWS = [
  row({}),
  row({ userId: 'u2', userName: 'علي حسن', kind: 'permission', targetId: 'tickets.view', targetNameAr: 'عرض التذاكر', targetNameEn: 'View tickets', scope: 'subtree:1', expiresAt: day(5) }),
  row({ userId: 'u3', userName: 'منى سعيد', kind: 'role-group', targetId: 'g9', targetNameAr: 'فريق الجودة', targetNameEn: 'Quality', grantedById: 'g2', grantedByName: 'ليلى', expiresAt: day(90) }),
];

const open = (keys = ['exceptions.view', 'exceptions.update', 'exceptions.revoke', 'exceptions.export'], latency = 150) => {
  server.use(
    // The permissions arrive after the rows (as they can under load): the actions must be waited for, never read at once.
    http.get('*/api/me', async () => { await delay(latency); return HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const })))); }),
    http.get('*/api/access/exceptions', () => HttpResponse.json(ROWS)),
  );
  renderPage(<ExceptionsTab />);
};

describe('Exceptions tab (FR-70)', () => {
  it('lists what was given outside the job title, with the kind, the scope in words and the end date', async () => {
    open();
    expect(await screen.findByText('علي حسن')).toBeInTheDocument();
    expect(screen.getByText('سارة أحمد')).toBeInTheDocument();
    expect(screen.getByText('وحدته ومستوى واحد تحتها')).toBeInTheDocument();
    expect(screen.getAllByText('بلا تاريخ انتهاء').length).toBeGreaterThan(0);
    expect(screen.getByText(`${day(5)} (بعد 5 يومًا)`)).toBeInTheDocument();
  });

  it('searches by the person, and by what was given', async () => {
    open();
    await screen.findByText('علي حسن');
    fireEvent.change(screen.getByLabelText('بحث في الاستثناءات'), { target: { value: 'منى' } });
    await waitFor(() => expect(screen.queryByText('علي حسن')).not.toBeInTheDocument());
    expect(screen.getByText('منى سعيد')).toBeInTheDocument();
  });

  it('takes an exception back after a confirmation, and changes its last day', async () => {
    let revoked = '';
    let changed: unknown;
    server.use(
      http.delete('*/api/access/exceptions/:kind/:userId/:targetId', ({ params }) => { revoked = `${params.kind}/${params.userId}/${params.targetId}`; return new HttpResponse(null, { status: 204 }); }),
      http.put('*/api/access/exceptions/:kind/:userId/:targetId', async ({ request }) => { changed = await request.json(); return new HttpResponse(null, { status: 200 }); }),
    );
    open();
    const personRow = (await screen.findByText('علي حسن')).closest('tr') as HTMLElement;
    fireEvent.click(await within(personRow).findByRole('button', { name: 'تغيير تاريخ الانتهاء' }));
    const date = await screen.findByLabelText('ينتهي في');
    fireEvent.change(date, { target: { value: day(40) } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(changed).toEqual({ expiresAt: day(40) }));
    fireEvent.click(await within(personRow).findByRole('button', { name: 'سحب الاستثناء' }));
    fireEvent.click(await screen.findByRole('button', { name: 'سحب الاستثناء', hidden: false }));
    await waitFor(() => expect(revoked).toBe('permission/u2/tickets.view'));
  });

  it('shows no actions to someone who may only see the list', async () => {
    // «Export» is held too, only to know the permissions have arrived: its button appears with them, so the absence checked below is a real answer and not a read before they loaded.
    open(['exceptions.view', 'exceptions.export']);
    await screen.findByText('علي حسن');
    await screen.findByRole('button', { name: 'تصدير' });
    expect(screen.queryByRole('button', { name: 'تغيير تاريخ الانتهاء' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'سحب الاستثناء' })).not.toBeInTheDocument();
  });
});

describe('daysLeft', () => {
  it('counts the days to the last day, today being 0, and nothing without an end date', () => {
    const now = new Date(2026, 10, 2, 15, 0);
    expect(daysLeft('2026-11-02', now)).toBe(0);
    expect(daysLeft('2026-11-12', now)).toBe(10);
    expect(daysLeft('2026-11-01', now)).toBe(-1);
    expect(daysLeft(null, now)).toBeNull();
  });
});
