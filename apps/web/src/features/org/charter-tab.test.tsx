import { CorePermission } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { sampleCharter, versionsDto } from '../../../test/org-fixtures';
import { openOrgPage } from '../../../test/org-harness';

beforeEach(() => window.localStorage.clear());

const serve = (dto: ReturnType<typeof versionsDto>) => http.get('*/api/org/nodes/:id/versions', () => HttpResponse.json(dto));

async function openCharter() {
  fireEvent.click(await screen.findByRole('button', { name: 'قسم الموارد البشرية' }));
  const details = await screen.findByRole('complementary', { name: 'تفاصيل الوحدة: قسم الموارد البشرية' });
  fireEvent.click(within(details).getByRole('tab', { name: 'الميثاق' }));
  return details;
}

describe('The charter tab of a unit (FR-99)', () => {
  it('marks the tab for the welcome tour', async () => {
    openOrgPage({ handlers: [serve(versionsDto())] });
    expect(await openCharter().then((d) => within(d).getByRole('tab', { name: 'الميثاق' }))).toHaveAttribute('data-tour', 'org-charter');
  });

  it('shows the empty state, with «write the charter» only for a holder of the charter key in admin mode', async () => {
    openOrgPage({ keys: [CorePermission.OrgCharterEdit], adminMode: true, handlers: [serve(versionsDto())] });
    const details = await openCharter();
    expect(await within(details).findByText('لا ميثاق لهذه الوحدة بعد')).toBeInTheDocument();
    expect(within(details).getByRole('button', { name: 'كتابة الميثاق' })).toBeInTheDocument();
  });

  it('offers no button to a person without the key', async () => {
    openOrgPage({ keys: [], adminMode: true, handlers: [serve(versionsDto())] });
    const details = await openCharter();
    expect(await within(details).findByText('لا ميثاق لهذه الوحدة بعد')).toBeInTheDocument();
    expect(within(details).queryByRole('button', { name: 'كتابة الميثاق' })).not.toBeInTheDocument();
  });

  it('shows the purpose and the four lists, in the language of the screen', async () => {
    openOrgPage({ handlers: [serve(versionsDto({ charter: sampleCharter() }))] });
    const details = await openCharter();
    expect(await within(details).findByText('تمكين الموظفين من أداء أعمالهم')).toBeInTheDocument();
    for (const text of ['سياسات الموارد البشرية', 'التوظيف', 'الرواتب', 'ميزانية سنوية ثابتة']) expect(within(details).getByText(text)).toBeInTheDocument();
    for (const heading of ['الغرض', 'المخرجات', 'داخل النطاق', 'خارج النطاق', 'الحدود']) expect(within(details).getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(within(details).queryByRole('button', { name: 'تعديل الميثاق' })).not.toBeInTheDocument();
  });

  it('writes the charter with a date and a reason: a later date is a scheduled version', async () => {
    const sent: Record<string, unknown>[] = [];
    openOrgPage({
      keys: [CorePermission.OrgCharterEdit],
      adminMode: true,
      handlers: [serve(versionsDto()), http.put('*/api/org/nodes/:id/charter', async ({ request }) => { sent.push((await request.json()) as Record<string, unknown>); return HttpResponse.json(versionsDto({ charter: sampleCharter() })); })],
    });
    const details = await openCharter();
    fireEvent.click(await within(details).findByRole('button', { name: 'كتابة الميثاق' }));
    const dialog = await screen.findByRole('dialog', { name: 'ميثاق الوحدة' });
    const save = within(dialog).getByRole('button', { name: 'حفظ' });
    expect(save).toBeDisabled(); // no reason yet
    fireEvent.change(within(dialog).getByLabelText('الغرض: العربية'), { target: { value: 'غرض الوحدة' } });
    fireEvent.change(within(dialog).getByLabelText('المخرجات: العربية'), { target: { value: 'مخرج أول\n\nمخرج ثانٍ' } });
    fireEvent.change(within(dialog).getByLabelText(/^سبب التعديل/), { target: { value: 'ab' } });
    expect(await within(dialog).findByText('يجب ألا يقل عن 3 أحرف.')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/^سبب التعديل/), { target: { value: 'كتابة الميثاق أول مرة' } });
    fireEvent.change(within(dialog).getByLabelText('يسري من *'), { target: { value: '2099-01-01' } });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ purpose: { ar: 'غرض الوحدة', en: '' }, outputs: { ar: ['مخرج أول', 'مخرج ثانٍ'], en: [] }, effectiveFrom: '2099-01-01', reason: 'كتابة الميثاق أول مرة' });
  });

  it('refuses a past effective date as the person types', async () => {
    openOrgPage({ keys: [CorePermission.OrgCharterEdit], adminMode: true, handlers: [serve(versionsDto({ charter: sampleCharter() }))] });
    const details = await openCharter();
    fireEvent.click(await within(details).findByRole('button', { name: 'تعديل الميثاق' }));
    const dialog = await screen.findByRole('dialog', { name: 'ميثاق الوحدة' });
    fireEvent.change(within(dialog).getByLabelText(/^سبب التعديل/), { target: { value: 'تحديث الغرض' } });
    fireEvent.change(within(dialog).getByLabelText('يسري من *'), { target: { value: '2020-01-01' } });
    expect(await within(dialog).findByText('لا يسري الميثاق من تاريخ ماضٍ.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'حفظ' })).toBeDisabled();
  });

  it('blocks a list with more lines than the contract allows', async () => {
    openOrgPage({ keys: [CorePermission.OrgCharterEdit], adminMode: true, handlers: [serve(versionsDto({ charter: sampleCharter() }))] });
    const details = await openCharter();
    fireEvent.click(await within(details).findByRole('button', { name: 'تعديل الميثاق' }));
    const dialog = await screen.findByRole('dialog', { name: 'ميثاق الوحدة' });
    fireEvent.change(within(dialog).getByLabelText(/^سبب التعديل/), { target: { value: 'تحديث الغرض' } });
    fireEvent.change(within(dialog).getByLabelText('المخرجات: العربية'), { target: { value: Array.from({ length: 31 }, (_, i) => `بند ${i + 1}`).join('\n') } });
    expect(await within(dialog).findByText('لا يزيد عدد السطور على 30.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'حفظ' })).toBeDisabled();
  });
});
