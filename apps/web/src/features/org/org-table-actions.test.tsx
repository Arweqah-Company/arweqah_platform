import { CorePermission, ORG_ADMIN_PERMISSIONS } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { openOrgPage } from '../../../test/org-harness';

beforeEach(() => window.localStorage.clear());

const rowOf = async (name: string) => (await screen.findByRole('button', { name })).closest('tr') as HTMLElement;
const actionsOf = (row: HTMLElement) => within(row).getAllByRole('button').map((b) => b.getAttribute('aria-label')).filter((l): l is string => !!l && l.includes(': '));
const verbs = (row: HTMLElement) => actionsOf(row).map((l) => l.split(': ')[0]);
/** The permissions load after the rows: wait until the row shows exactly these actions. */
const expectActions = async (name: string, expected: string[]) => {
  await rowOf(name);
  await waitFor(() => expect(verbs(screen.getByRole('button', { name }).closest('tr') as HTMLElement)).toEqual(expected));
};

describe('Organization table: every action on a unit is on its row, as icons (FR-96)', () => {
  it('offers view, add below, change type, edit, move and delete, each only where it makes sense', async () => {
    openOrgPage({ keys: ORG_ADMIN_PERMISSIONS, adminMode: true });
    await expectActions('قطاع التشغيل', ['عرض', 'إضافة وحدة تحتها', 'تغيير نوع الإدارة', 'تعديل', 'حذف']); // a sector never moves
    await expectActions('قسم الموارد البشرية', ['عرض', 'إضافة وحدة تحتها', 'تغيير نوع الإدارة', 'تعديل', 'نقل', 'حذف']);
    await expectActions('وحدة التوظيف', ['عرض', 'تغيير نوع الإدارة', 'تعديل', 'نقل', 'حذف']); // nothing may be created under a unit
  });

  it('adds «set code» on a unit that has no code only', async () => {
    openOrgPage({ keys: ORG_ADMIN_PERMISSIONS, adminMode: true });
    await expectActions('قسم الموارد البشرية', ['عرض', 'إضافة وحدة تحتها', 'تغيير نوع الإدارة', 'تعديل', 'نقل', 'حذف']);
    await expectActions('وحدة قديمة', ['عرض', 'تغيير نوع الإدارة', 'تحديد الرمز', 'تعديل', 'نقل', 'حذف']);
  });

  it('shows the action of one key and nothing else', async () => {
    openOrgPage({ keys: [CorePermission.OrgUnitShare], adminMode: true });
    expect(verbs(await rowOf('قسم الموارد البشرية'))).toEqual(['عرض', 'تغيير نوع الإدارة']);
  });

  it('shows only the view action to somebody without the organization keys, and none of the others in plain mode', async () => {
    openOrgPage({ keys: ORG_ADMIN_PERMISSIONS, adminMode: false });
    expect(verbs(await rowOf('قسم الموارد البشرية'))).toEqual(['عرض']);
  });

  it('opens the dialog of the action from the row', async () => {
    openOrgPage({ keys: ORG_ADMIN_PERMISSIONS, adminMode: true });
    const row = await rowOf('قسم الموارد البشرية');
    fireEvent.click(await within(row).findByRole('button', { name: /^تعديل/ }));
    expect(await screen.findByRole('dialog', { name: 'تعديل الوحدة' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    fireEvent.click(within(row).getByRole('button', { name: /^تغيير نوع الإدارة/ }));
    expect(await screen.findByRole('dialog', { name: 'تغيير نوع إدارة الوحدة' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    fireEvent.click(within(row).getByRole('button', { name: /^حذف/ }));
    expect(await screen.findByRole('dialog', { name: 'حذف الوحدة؟' })).toBeInTheDocument();
  });

  it('selects the unit when the row is clicked anywhere', async () => {
    openOrgPage();
    fireEvent.click(await rowOf('قسم الموارد البشرية'));
    expect(await screen.findByRole('complementary', { name: /قسم الموارد البشرية/ })).toBeInTheDocument();
  });
});
