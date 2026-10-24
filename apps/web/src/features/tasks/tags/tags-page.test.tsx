import { CorePermission as P, type TaskTagAdminDto } from '@arweqah-platform/shared';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { TagsPage } from './tags-page';

const tag: TaskTagAdminDto = { id: 'g1', orgNodeId: 'n1', nameAr: 'تقارير', nameEn: 'Reports', isActive: true, departmentNameAr: 'إدارة المبيعات', departmentNameEn: 'Sales' };

function serve(tags: TaskTagAdminDto[], keys: string[]) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'own' as const }))))),
    http.get('*/api/task-tags', () => HttpResponse.json(tags)),
  );
}

describe('Task tags page (FR-54)', () => {
  it('says that no department has created tags yet', async () => {
    serve([], [P.TasksTagsView]);
    renderPage(<TagsPage />);
    expect(await screen.findByText('لا فئات بعد')).toBeInTheDocument();
  });

  it('lists each tag with its department and shows the buttons its keys allow', async () => {
    serve([tag], [P.TasksTagsView, P.TasksTagCreate, P.TasksTagUpdate]);
    renderPage(<TagsPage />);
    expect(await screen.findByText('تقارير')).toBeInTheDocument();
    expect(screen.getByText('إدارة المبيعات')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إضافة فئة' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تعديل' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حذف' })).not.toBeInTheDocument();
  });

  it('shows no add button without the create key', async () => {
    serve([tag], [P.TasksTagsView]);
    renderPage(<TagsPage />);
    await screen.findByText('تقارير');
    expect(screen.queryByRole('button', { name: 'إضافة فئة' })).not.toBeInTheDocument();
  });
});
