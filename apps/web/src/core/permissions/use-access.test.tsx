import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { access, me, server } from '../../../test/msw';
import { refreshAccess } from './access-key';
import { usePermissions } from './can';

function Probe() {
  const { can, ready } = usePermissions();
  return <p>{ready ? (can('audit.view') ? 'audit' : 'no audit') : 'loading'}</p>;
}

/** The page can be mounted and unmounted: the permissions are not asked for again. */
function Toggle() {
  const [shown, setShown] = useState(true);
  return <><button onClick={() => setShown(!shown)}>toggle</button>{shown && <Probe />}</>;
}

describe('Permissions are read once and kept for the session (FR-88)', () => {
  it('asks /me/access once, keeps it across remounts, and asks again only when told to', async () => {
    let calls = 0;
    let withAudit = false;
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.get('*/api/me/access', () => { calls += 1; return HttpResponse.json(access(withAudit ? [{ key: 'audit.view', scope: 'all' }] : [])); }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><Toggle /></QueryClientProvider>);
    expect(await screen.findByText('no audit')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.queryByText('no audit')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(await screen.findByText('no audit')).toBeInTheDocument();
    expect(calls).toBe(1);

    withAudit = true; // platform admin mode was turned on
    await refreshAccess(client);
    expect(await screen.findByText('audit')).toBeInTheDocument();
    await waitFor(() => expect(calls).toBe(2));
  });

  it('does not ask before the person is code-verified', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/me', () => HttpResponse.json({ ...me(), mfaVerified: false })),
      http.get('*/api/me/access', () => { calls += 1; return HttpResponse.json(access()); }),
    );
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Probe /></QueryClientProvider>);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(calls).toBe(0);
    expect(screen.getByText('loading')).toBeInTheDocument();
  });
});
