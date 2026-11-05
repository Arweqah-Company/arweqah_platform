import { ALL_EDITABLE_FIELDS, DEFAULT_EDITABLE_FIELDS, type PermissionCatalogGroup, type PermissionGrant } from '@arweqah-platform/shared';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { PermissionMatrix } from './permission-matrix';

const catalog: PermissionCatalogGroup[] = [
  { module: 'employees', permissions: [
    { key: 'employees.update', module: 'employees', labelAr: 'تعديل بيانات الموظفين', labelEn: 'Edit employees', scopes: ['own', 'unit', 'company', 'all'] },
    { key: 'employees.view', module: 'employees', labelAr: 'عرض الموظفين', labelEn: 'View employees', scopes: ['own', 'company', 'all'] },
  ] },
];

function Harness({ initial = [], onChange, disabled }: { initial?: PermissionGrant[]; onChange: (grants: PermissionGrant[]) => void; disabled?: boolean }) {
  const [grants, setGrants] = useState<PermissionGrant[]>(initial);
  return <PermissionMatrix catalog={catalog} grants={grants} disabled={disabled} onChange={(g) => { setGrants(g); onChange(g); }} />;
}

describe('The fields of «edit employees» belong to each grant (FR-94)', () => {
  it('starts a new grant with the basic data (contact and personal) and shows how many fields it gives', () => {
    let latest: PermissionGrant[] = [];
    render(<Harness onChange={(g) => { latest = g; }} />);
    expect(screen.queryByRole('button', { name: /الحقول التي يعدّلها/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'تعديل بيانات الموظفين' }));
    expect(latest.find((g) => g.key === 'employees.update')?.fields).toEqual([...DEFAULT_EDITABLE_FIELDS]);
    expect(screen.getByRole('button', { name: `الحقول التي يعدّلها (${DEFAULT_EDITABLE_FIELDS.length})` })).toBeInTheDocument();
    expect(latest.find((g) => g.key === 'employees.view')).toBeUndefined();
  });

  it('opens a checklist grouped by kind of detail where the administrator adds a group or a single field, with no field locked', () => {
    let latest: PermissionGrant[] = [];
    render(<Harness initial={[{ key: 'employees.update', scope: 'own', fields: [...DEFAULT_EDITABLE_FIELDS] }]} onChange={(g) => { latest = g; }} />);
    fireEvent.click(screen.getByRole('button', { name: /الحقول التي يعدّلها/ }));
    const dialog = screen.getByRole('dialog');
    const pay = within(dialog).getByRole('region', { name: /الراتب والحساب/ });
    fireEvent.click(within(pay).getByRole('button', { name: 'تحديد الكل' }));
    expect(latest[0]?.fields).toEqual(expect.arrayContaining(['monthlyGrossSalary', 'iban', 'salaryCurrencyCountryId', ...DEFAULT_EDITABLE_FIELDS]));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'الآيبان' }));
    expect(latest[0]?.fields).not.toContain('iban');
    expect(within(dialog).getByRole('checkbox', { name: 'إجمالي الراتب الشهري' })).not.toBeDisabled();
  });

  it('has quick choices: the basic data, every field, none', () => {
    let latest: PermissionGrant[] = [];
    render(<Harness initial={[{ key: 'employees.update', scope: 'company', fields: ['profession'] }]} onChange={(g) => { latest = g; }} />);
    fireEvent.click(screen.getByRole('button', { name: /الحقول التي يعدّلها/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'الكل' }));
    expect(latest[0]?.fields).toHaveLength(ALL_EDITABLE_FIELDS.length);
    fireEvent.click(within(dialog).getByRole('button', { name: 'الأساسية' }));
    expect(latest[0]?.fields).toEqual([...DEFAULT_EDITABLE_FIELDS]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'لا شيء' }));
    expect(latest[0]?.fields).toEqual([]);
  });

  it('keeps the fields when the reach changes, and gives every field with «select all»', () => {
    let latest: PermissionGrant[] = [];
    render(<Harness initial={[{ key: 'employees.update', scope: 'own', fields: ['profession'] }]} onChange={(g) => { latest = g; }} />);
    fireEvent.click(screen.getByRole('button', { name: 'تحديد كل الصلاحيات' }));
    expect(latest.find((g) => g.key === 'employees.update')?.fields).toHaveLength(ALL_EDITABLE_FIELDS.length);
  });

  it('only shows the choice, and changes nothing, when the grants are read-only', () => {
    render(<Harness initial={[{ key: 'employees.update', scope: 'own', fields: ['profession'] }]} disabled onChange={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /الحقول التي يعدّلها/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('checkbox', { name: 'المهنة' })).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: 'الكل' })).not.toBeInTheDocument();
  });
});
