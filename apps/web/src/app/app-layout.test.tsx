import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../test/msw';
import { renderRoute } from '../../test/render';
import { AppLayout } from './app-layout';

describe('AppLayout navigation', () => {
  it('shows the foundation sections and the signed-in user', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json(me([]))));
    renderRoute([{ path: '/', element: <AppLayout />, children: [{ index: true, element: <p>home</p> }] }]);
    expect(await screen.findByRole('link', { name: 'الرئيسية' })).toBeInTheDocument();
    const account = screen.getByRole('button', { name: 'حسابي' });
    expect(account).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'الأمان' })).not.toBeInTheDocument();
    fireEvent.click(account);
    expect(screen.getByRole('link', { name: 'الأمان' })).toBeInTheDocument();
  });
});
