import { CorePermission as P } from '@arweqah-platform/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { usePermissions } from '@/core/permissions/can';
import { me, server } from '../../../../test/msw';
import { taskDetail, taskItem } from '../../../../test/task-fixtures';
import { useBoardMove } from './use-board-move';

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
const first = taskItem({ id: 'a', status: 'todo', revision: 1 });
const second = taskItem({ id: 'b', status: 'in_progress', revision: 1 });

describe('A move that ends does not touch the window of another task (review of PR 196)', () => {
  it('leaves the hand-in window of task B open when the earlier move of task A succeeds', async () => {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me([{ key: P.TasksFileDeliver, scope: 'all' }]))),
      http.post('*/api/tasks/a/transition', async () => { await delay(60); return HttpResponse.json(taskDetail({ id: 'a' })); }),
    );
    const { result } = renderHook(() => ({ board: useBoardMove(), mayDeliver: usePermissions().can(P.TasksFileDeliver) }), { wrapper });
    await waitFor(() => expect(result.current.mayDeliver).toBe(true)); // the person's keys are loaded
    act(() => result.current.board.move(first, 'in_progress'));
    act(() => result.current.board.move(second, 'done'));
    await waitFor(() => expect(result.current.board.pending?.task.id).toBe('b'));
    await act(async () => { await new Promise((r) => setTimeout(r, 120)); }); // task A's move ends
    expect(result.current.board.pending?.task.id).toBe('b');
  });
});
