import type { EmployeeDto } from '@arweqah-platform/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '../../../test/render';
import { DetailsSections } from './details-sections';
import type { EmployeeOptions } from './form/use-options';

const role = (id: string, nameAr: string) => ({ id, nameAr, nameEn: nameAr, expiresAt: null });

describe('Employee view shows the roles the person holds (FR-69)', () => {
  it('lists the head role of a unit next to the other roles', async () => {
    const employee = { company: { id: 'c', nameAr: 'شركة', nameEn: 'Co' }, orgNode: null, jobTitle: null, manager: null, roles: [role('1', 'موظف'), role('2', 'قائد قطاع ساره')], sensitiveHidden: true, notes: null } as unknown as EmployeeDto;
    const options = new Proxy({}, { get: () => [] }) as unknown as EmployeeOptions;
    renderRoute([{ path: '/e', element: <DetailsSections employee={employee} options={options} /> }], '/e');
    expect(await screen.findByText('قائد قطاع ساره')).toBeInTheDocument();
    expect(screen.getByText('موظف')).toBeInTheDocument();
  });
});
