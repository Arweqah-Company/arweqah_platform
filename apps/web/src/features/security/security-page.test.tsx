import type { SessionDto, TrustedDeviceDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { SecurityPage } from './security-page';

const SESSIONS: SessionDto[] = [
  { id: 's1', device: 'Chrome / Windows', ip: '10.1.2.x', createdAt: '2026-11-01T08:00:00Z', lastActiveAt: '2026-11-02T08:00:00Z', current: true },
  { id: 's2', device: 'Safari / iOS', ip: '10.1.9.x', createdAt: '2026-10-30T08:00:00Z', lastActiveAt: '2026-10-31T08:00:00Z', current: false },
];
const DEVICES: TrustedDeviceDto[] = [{ id: 'd1', label: 'Chrome / Windows', createdAt: '2026-10-30T08:00:00Z', lastUsedAt: null, expiresAt: '2026-12-01T08:00:00Z', current: true }];

const open = (enabled = true, devices: TrustedDeviceDto[] = DEVICES) => {
  server.use(
    http.get('*/api/me', () => HttpResponse.json({ ...me(), trustedDevicesEnabled: enabled })),
    http.get('*/api/me/sessions', () => HttpResponse.json(SESSIONS)),
    http.get('*/api/me/trusted-devices', () => HttpResponse.json(devices)),
  );
  renderPage(<SecurityPage />);
};

describe('Security page: sessions and trusted devices (FR-73)', () => {
  it('lists the sessions with the current one marked, and offers to end the others only', async () => {
    open();
    expect(await screen.findByText('Safari / iOS')).toBeInTheDocument();
    const list = screen.getByRole('heading', { name: 'الأجهزة المسجّل دخولك عليها' }).closest('section') as HTMLElement;
    expect(within(list).getByText('هذا الجهاز')).toBeInTheDocument();
    expect(within(list).getAllByRole('button', { name: 'إنهاء الجلسة' })).toHaveLength(1);
    expect(within(list).getByRole('button', { name: 'إنهاء كل الجلسات الأخرى' })).toBeEnabled();
  });

  it('ends one session and all the others', async () => {
    const calls: string[] = [];
    server.use(
      http.delete('*/api/me/sessions/:id', ({ params }) => { calls.push(`one:${String(params.id)}`); return new HttpResponse(null, { status: 204 }); }),
      http.delete('*/api/me/sessions', () => { calls.push('others'); return HttpResponse.json({ ended: 1 }); }),
    );
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'إنهاء الجلسة' }));
    await waitFor(() => expect(calls).toEqual(['one:s2']));
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء كل الجلسات الأخرى' }));
    await waitFor(() => expect(calls).toEqual(['one:s2', 'others']));
  });

  it('lists the trusted browsers and stops trusting one', async () => {
    let removed = '';
    server.use(http.delete('*/api/me/trusted-devices/:id', ({ params }) => { removed = String(params.id); return new HttpResponse(null, { status: 204 }); }));
    open();
    expect(await screen.findByRole('heading', { name: 'أجهزة موثوقة' })).toBeInTheDocument();
    expect(screen.getByText('هذا المتصفح')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء التوثيق' }));
    await waitFor(() => expect(removed).toBe('d1'));
  });

  it('hides the trusted-devices section when it is off and none exist', async () => {
    open(false, []);
    await screen.findByText('Safari / iOS');
    expect(screen.queryByRole('heading', { name: 'أجهزة موثوقة' })).not.toBeInTheDocument();
  });
});
