import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { AddWriterDialog } from '../channels/add-writer-dialog';
import type { NoticeChannelDto } from '@arweqah-platform/shared';
import { channelOf } from './channel-fixtures';

const channels: NoticeChannelDto[] = [channelOf('hr', { nameAr: 'الموارد البشرية', nameEn: 'Human resources', canAddWriter: true })];
const candidate = { employeeId: 'e1', userId: 'u9', name: 'منى الحربي', jobTitle: { nameAr: 'أخصائية', nameEn: 'Specialist' }, unit: { id: 'n1', nameAr: 'التوظيف', nameEn: 'Hiring' }, hasNoApprover: true };

describe('Add a writer (FR-174, FR-177)', () => {
  it('finds the employee from the first letter, keeps «Add» off until one is picked, warns when no leader approves', async () => {
    const added = vi.fn();
    const searches: (string | null)[] = [];
    const account = me([{ key: 'notices.writer_add', scope: 'subtree' }]);
    server.use(
      http.get('*/api/me', () => HttpResponse.json(account)),
      http.get('*/api/notices/channels/hr/candidates', ({ request }) => { searches.push(new URL(request.url).searchParams.get('search')); return HttpResponse.json([candidate]); }),
      http.post('*/api/notices/channels/hr/writers', async ({ request }) => { added(await request.json()); return HttpResponse.json({}); }),
    );
    renderPage(<AddWriterDialog channels={channels} initial="hr" onClose={() => undefined} />);
    const add = await screen.findByRole('button', { name: 'إضافة الكاتب' });
    expect(add).toBeDisabled();
    fireEvent.click(screen.getByRole('combobox', { name: 'الموظف' }));
    fireEvent.change(await screen.findByPlaceholderText('ابحث…'), { target: { value: 'م' } });
    await waitFor(() => expect(searches).toContain('م'));
    const option = await waitFor(() => { const el = [...document.querySelectorAll('[cmdk-item]')].find((x) => x.textContent?.includes('منى الحربي')); if (!el) throw new Error('not listed'); return el; });
    fireEvent.click(option);
    expect(await screen.findByText(/بلا قائد أعلى/)).toBeInTheDocument();
    expect(add).toBeEnabled();
    fireEvent.click(add);
    await waitFor(() => expect(added).toHaveBeenCalledWith({ employeeId: 'e1' }));
  });
});
