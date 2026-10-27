import type { UpsertRoleInput } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { RoleEditor } from './role-editor';
import { chooseOption } from '../../../test/select';

describe('RoleEditor', () => {
  it('sends the ticked permission with the chosen scope', async () => {
    let sent: UpsertRoleInput | undefined;
    server.use(
      http.post('*/api/roles', async ({ request }) => {
        sent = (await request.json()) as UpsertRoleInput;
        return HttpResponse.json({ id: 'r2', ...sent, isSystem: false, description: null, usersCount: 0 }, { status: 201 });
      }),
    );
    renderPage(<RoleEditor role={null} open onOpenChange={() => undefined} />);
    fireEvent.change(screen.getByLabelText('الاسم بالعربية'), { target: { value: 'مشرف قسم' } });
    fireEvent.change(screen.getByLabelText('الاسم بالإنجليزية'), { target: { value: 'Department lead' } });
    fireEvent.click(await screen.findByLabelText('عرض الموظفين'));
    await chooseOption(screen.getByLabelText('النطاق: عرض الموظفين'), 'subtree');
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(sent?.permissions).toEqual([{ key: 'employees.view', scope: 'subtree' }]));
  });
});
