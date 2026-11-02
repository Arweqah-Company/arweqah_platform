import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { SecuritySettingsTab } from './security-settings-tab';

const open = (keys = ['security_settings.view', 'security_settings.edit']) => {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/security-settings', () => HttpResponse.json({ trustedDeviceDays: 0, requestsPerMinute: 600 })),
  );
  renderPage(<SecuritySettingsTab />);
};

describe('Security settings tab (FR-73, FR-76)', () => {
  it('shows the numbers, checks their range, and saves them', async () => {
    let saved: unknown;
    server.use(http.put('*/api/security-settings', async ({ request }) => { saved = await request.json(); return HttpResponse.json(saved); }));
    open();
    const days = await screen.findByLabelText('أيام الجهاز الموثوق');
    expect(days).toHaveValue(0);
    fireEvent.change(days, { target: { value: '400' } });
    expect(await screen.findByText('أدخل رقمًا صحيحًا بين 0 و365.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled();
    fireEvent.change(days, { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(saved).toEqual({ trustedDeviceDays: 30, requestsPerMinute: 600 }));
  });

  it('is read-only without the edit key', async () => {
    open(['security_settings.view']);
    expect(await screen.findByLabelText('أيام الجهاز الموثوق')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'حفظ' })).not.toBeInTheDocument();
  });
});
