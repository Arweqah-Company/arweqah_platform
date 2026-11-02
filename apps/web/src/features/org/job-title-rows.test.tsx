import type { JobTitleInput } from '@arweqah-platform/shared';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { me, roles, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { chooseOption } from '../../../test/select';
import { JobTitleRows } from './job-title-rows';

const derived = { ...roles[0], id: 'r-derived', nameAr: 'محاسب', nameEn: 'Accountant', autoRule: 'job_title' as const, assignment: 'auto' as const };
const manual = { ...roles[0], id: 'r-manual', nameAr: 'مشرف', nameEn: 'Supervisor' };

function Harness({ onChange }: { onChange: (rows: JobTitleInput[]) => void }) {
  const [rows, setRows] = useState<JobTitleInput[]>([{ nameAr: 'محلل', nameEn: 'Analyst' }]);
  return <JobTitleRows rows={rows} minimum={1} onChange={(next) => { setRows(next); onChange(next); }} />;
}

describe('JobTitleRows: the role the title starts with (FR-68)', () => {
  it('offers the roles to copy, never a role that follows a job title, and sends the chosen one', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json(me([{ key: 'roles.view', scope: 'all' }]))), http.get('*/api/roles', () => HttpResponse.json([derived, manual])));
    let latest: JobTitleInput[] = [];
    renderPage(<Harness onChange={(rows) => { latest = rows; }} />);
    const trigger = await screen.findByLabelText('نسخ الصلاحيات من دور');
    expect(screen.queryByText('محاسب')).not.toBeInTheDocument();
    await chooseOption(trigger, 'r-manual');
    await waitFor(() => expect(latest[0]?.templateRoleId).toBe('r-manual'));
  });

  it('hides the choice from a person who cannot see roles', async () => {
    renderPage(<Harness onChange={() => undefined} />);
    await screen.findByLabelText('الاسم بالعربي');
    expect(screen.queryByLabelText('نسخ الصلاحيات من دور')).not.toBeInTheDocument();
  });
});
