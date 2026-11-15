import type { EmployeeDto } from '@arweqah-platform/shared';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { RolesDialog } from './roles-dialog';

const role = (id: string, nameAr: string) => ({ id, nameAr, nameEn: nameAr, autoRule: null, origin: null });

describe('The roles dialog offers what the person may give (FR-129)', () => {
  it('reads the grantable roles, not the roles page, and still shows the roles the employee has', async () => {
    let askedRolesPage = false;
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.get('*/api/roles/grantable', () => HttpResponse.json([role('a', 'دور مسموح')])),
      http.get('*/api/roles', () => { askedRolesPage = true; return HttpResponse.json([]); }),
    );
    const employee = { id: 'e1', company: { id: 'c', nameAr: 'شركة', nameEn: 'Co' }, roles: [{ id: 'h', nameAr: 'دور لا يملكه القائد', nameEn: 'Held', expiresAt: null }] } as unknown as EmployeeDto;
    renderPage(<RolesDialog employee={employee} open onOpenChange={() => undefined} />);
    expect(await screen.findByText('دور مسموح')).toBeInTheDocument();
    expect(screen.getByText('دور لا يملكه القائد')).toBeInTheDocument();
    expect(askedRolesPage).toBe(false);
  });
});
