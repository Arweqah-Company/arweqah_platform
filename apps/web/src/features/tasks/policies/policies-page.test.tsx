import { TASK_POLICY_DEFAULTS, type TaskPolicyDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { PoliciesPage } from './policies-page';

const policy = (over: Partial<TaskPolicyDto> = {}): TaskPolicyDto => ({ companyId: 'company-1', ...TASK_POLICY_DEFAULTS, ...over });

function serve() {
  const saved: Record<string, unknown>[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me([{ key: 'tasks.policies_edit', scope: 'all' }]))),
    http.get('*/api/task-policies', () => HttpResponse.json(policy())),
    http.put('*/api/task-policies', async ({ request }) => {
      saved.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json(policy({ staleDays: 45 }));
    }),
  );
  return saved;
}

describe('Task policies page (FR-54)', () => {
  it('shows every number of the rules with its limits, in sections', async () => {
    serve();
    renderPage(<PoliciesPage />);
    expect(await screen.findByLabelText('راكدة بعد عدم الحركة لمدة (أيام)')).toHaveValue(30);
    expect(screen.getByLabelText('يسقط الاعتراض بعد (أيام عمل)')).toHaveValue(3);
    expect(screen.getByLabelText('الأثر الرجعي المسموح (أيام)')).toHaveValue(7);
    expect(screen.getAllByText('من 7 إلى 180').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'المواعيد والتذكير' })).toBeInTheDocument();
  });

  it('refuses a value outside its limits, in words, and keeps the save button off', async () => {
    serve();
    renderPage(<PoliciesPage />);
    const stale = await screen.findByLabelText('راكدة بعد عدم الحركة لمدة (أيام)');
    fireEvent.change(stale, { target: { value: '3' } });
    expect(await screen.findByText('استعمل عددًا صحيحًا من 7 إلى 180.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'حفظ' })).toBeDisabled();
  });

  it('saves the numbers as numbers', async () => {
    const saved = serve();
    renderPage(<PoliciesPage />);
    fireEvent.change(await screen.findByLabelText('راكدة بعد عدم الحركة لمدة (أيام)'), { target: { value: '45' } });
    fireEvent.click(await screen.findByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0]).toEqual({ ...TASK_POLICY_DEFAULTS, staleDays: 45 });
  });
});
