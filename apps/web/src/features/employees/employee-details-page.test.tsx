import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { employeeFixture, openEmployeePage } from '../../../test/employees-fixtures';

describe('Employee view page (FR-87)', () => {
  it('shows the names it was given and never loads the drop-down lists', async () => {
    const asked: string[] = [];
    const named = employeeFixture({ names: { ...employeeFixture().names, relationType: { nameAr: 'موظف دائم', nameEn: 'Permanent' } } });
    openEmployeePage(['employees.view'], named, '', http.get('*/api/lookups*', ({ request }) => {
      asked.push(new URL(request.url).pathname);
      return HttpResponse.json([]);
    }));
    expect(await screen.findByText('موظف دائم')).toBeInTheDocument();
    expect(asked).toEqual([]);
  });
});
