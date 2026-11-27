import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { diagnosticsSnapshot, recordFailedRequest, recordScreenError } from '../api/problem-diagnostics';
import { useSignOut } from './session';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe('Signing out (FR-199)', () => {
  it('forgets the failed calls and errors of the session, so the next person\'s problem report never carries them', async () => {
    recordFailedRequest('GET', '/employees/secret-id', 500);
    recordScreenError('Employee Sara Ahmed was not found');
    const { result } = renderHook(() => useSignOut(), { wrapper });
    await result.current().catch(() => undefined); // the request may or may not reach a server here; the session's data is forgotten either way
    expect(diagnosticsSnapshot()).toEqual({ failedRequests: [], errors: [] });
  });
});
