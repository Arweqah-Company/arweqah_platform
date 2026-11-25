import { CorePermission } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { leadersDto, N } from '../../../test/org-fixtures';
import { openOrgPage } from '../../../test/org-harness';

beforeEach(() => window.localStorage.clear());

const serve = http.get('*/api/org/nodes/:id/leaders', () => HttpResponse.json(leadersDto()));
const link = `/?unit=${N.section}&tab=leaders&assign=leader`;
const FORM = 'تعيين قائد أو قائم بالأعمال';

describe('A link opens the leaders tab of a unit with the assignment form open (FR-182)', () => {
  it('opens the unit, its leaders tab and the form for who may assign, in admin mode', async () => {
    openOrgPage({ keys: [CorePermission.OrgLeadersManage], adminMode: true, path: link, handlers: [serve] });
    expect(await screen.findByRole('dialog', { name: FORM })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'تفاصيل الوحدة: قسم الموارد البشرية', hidden: true })).toBeInTheDocument();
  });

  it('opens only the tab, with no form, while admin mode is off', async () => {
    openOrgPage({ keys: [CorePermission.OrgLeadersManage], adminMode: false, path: link, handlers: [serve] });
    expect(await screen.findByRole('tab', { name: 'القادة', selected: true })).toBeInTheDocument();
    await screen.findByText('خالد العتيبي');
    expect(screen.queryByRole('dialog', { name: FORM })).not.toBeInTheDocument();
  });

  it('opens only the tab, with no form, for a person without the leaders key', async () => {
    openOrgPage({ keys: [], adminMode: true, path: link, handlers: [serve] });
    expect(await screen.findByRole('tab', { name: 'القادة', selected: true })).toBeInTheDocument();
    await screen.findByText('خالد العتيبي');
    expect(screen.queryByRole('dialog', { name: FORM })).not.toBeInTheDocument();
  });

  it('opens the form once: closing it and coming back to the tab does not open it again', async () => {
    openOrgPage({ keys: [CorePermission.OrgLeadersManage], adminMode: true, path: link, handlers: [serve] });
    const dialog = await screen.findByRole('dialog', { name: FORM });
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'إلغاء' })[0] as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: FORM })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'نظرة عامة' }));
    fireEvent.click(await screen.findByRole('tab', { name: 'القادة' }));
    await screen.findByText('خالد العتيبي');
    expect(screen.queryByRole('dialog', { name: FORM })).not.toBeInTheDocument();
  });
});
