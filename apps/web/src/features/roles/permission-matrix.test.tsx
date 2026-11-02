import type { PermissionCatalogGroup, PermissionGrant } from '@arweqah-platform/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { chooseOption, optionLabels } from '../../../test/select';
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

  it('offers how many levels of units below the permission reaches, for a permission that allows subtree (FR-80)', async () => {
    render(<PermissionMatrix catalog={catalog} grants={[{ key: 'employees.view', scope: 'unit' }]} onChange={() => undefined} />);
    const labels = await optionLabels(screen.getByLabelText(/النطاق: عرض الموظفين/));
    expect(labels).toEqual(['سجله فقط', 'وحدته', 'وحدته ومستوى واحد تحتها', 'وحدته ومستويان تحتها', 'وحدته وثلاثة مستويات تحتها', 'وحدته وأربعة مستويات تحتها', 'وحدته وخمسة مستويات تحتها', 'وحدته وما تحتها', 'شركته كاملة', 'كل الشركات']);
  });

  it('gives no depth for a permission that does not allow subtree, and sends the depth chosen', async () => {
    let latest: PermissionGrant[] = [];
    const depthCatalog: PermissionCatalogGroup[] = [{ module: 'org', permissions: [
      { key: 'org.view', module: 'org', labelAr: 'عرض الهيكل', labelEn: 'View structure', scopes: ['unit', 'subtree', 'company', 'all'] },
      { key: 'org.edit', module: 'org', labelAr: 'تعديل الهيكل', labelEn: 'Edit structure', scopes: ['unit', 'company'] },
    ] }];
    function Both() {
      const [grants, setGrants] = useState<PermissionGrant[]>([{ key: 'org.view', scope: 'unit' }, { key: 'org.edit', scope: 'unit' }]);
      return <PermissionMatrix catalog={depthCatalog} grants={grants} onChange={(g) => { setGrants(g); latest = g; }} />;
    }
    render(<Both />);
    expect(await optionLabels(screen.getByLabelText(/النطاق: تعديل الهيكل/))).toEqual(['وحدته', 'شركته كاملة']);
    await chooseOption(screen.getByLabelText(/النطاق: عرض الهيكل/), 'subtree:1');
    await waitFor(() => expect(latest).toContainEqual({ key: 'org.view', scope: 'subtree:1' }));
  });
});
