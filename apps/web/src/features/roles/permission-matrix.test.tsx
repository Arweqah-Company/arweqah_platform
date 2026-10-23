import type { PermissionCatalogGroup, PermissionGrant } from '@arweqah-platform/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { PermissionMatrix } from './permission-matrix';

const catalog: PermissionCatalogGroup[] = [
  { module: 'employees', permissions: [
    { key: 'employees.view', module: 'employees', labelAr: 'عرض الموظفين', labelEn: 'View employees', scopes: ['own', 'unit', 'subtree', 'company', 'all'] },
    { key: 'employees.create', module: 'employees', labelAr: 'إضافة موظفين', labelEn: 'Add employees', scopes: ['company', 'all'] },
  ] },
  { module: 'audit', permissions: [{ key: 'audit.view', module: 'audit', labelAr: 'عرض سجل التدقيق', labelEn: 'View audit log', scopes: ['all'] }] },
];

function Harness({ onChange }: { onChange: (grants: PermissionGrant[]) => void }) {
  const [grants, setGrants] = useState<PermissionGrant[]>([]);
  return <PermissionMatrix catalog={catalog} grants={grants} onChange={(g) => { setGrants(g); onChange(g); }} />;
}

describe('Permission matrix (FR-47)', () => {
  it('selects every permission at its widest scope, and clears them all again', () => {
    let latest: PermissionGrant[] = [];
    render(<Harness onChange={(g) => { latest = g; }} />);
    fireEvent.click(screen.getByRole('button', { name: 'تحديد كل الصلاحيات' }));
    expect(latest).toEqual([{ key: 'employees.view', scope: 'all' }, { key: 'employees.create', scope: 'all' }, { key: 'audit.view', scope: 'all' }]);
    expect(screen.getByRole('checkbox', { name: 'عرض سجل التدقيق' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء كل التحديد' }));
    expect(latest).toEqual([]);
    expect(screen.getByRole('checkbox', { name: 'عرض الموظفين' })).not.toBeChecked();
  });

  it('offers no select-all when the matrix is read-only', () => {
    render(<PermissionMatrix catalog={catalog} grants={[]} onChange={() => undefined} disabled />);
    expect(screen.queryByRole('button', { name: 'تحديد كل الصلاحيات' })).not.toBeInTheDocument();
  });
});
