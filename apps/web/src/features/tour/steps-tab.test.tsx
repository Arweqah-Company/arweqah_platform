import { CorePermission as P, TOUR_IDS, type TourStepSettingDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { TourStepsTab } from './steps-tab';

const step = (over: Partial<TourStepSettingDto>): TourStepSettingDto => ({
  key: 'welcome', tour: 'general', order: 1, enabled: true, permission: null, page: null, customised: false, updatedAt: null,
  titleAr: 'أهلًا بك', titleEn: 'Welcome', bodyAr: null, bodyEn: null, ...over,
});
const ALL = [P.TourSettingsView, P.TourSettingsEdit, P.TourSettingsToggle, P.TourSettingsReorder, P.TourSettingsReset, P.TourSettingsExport];

function serve(steps: TourStepSettingDto[], keys: string[] = ALL) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/tour-steps', () => HttpResponse.json({ steps })),
  );
}
const rowOf = (name: RegExp) => screen.getByRole('row', { name });

describe('Welcome tour settings tab (FR-67)', () => {
  it('lists every step with its tour and state, and searches the wording', async () => {
    serve([step({}), step({ key: 'home', order: 2, titleAr: 'الصفحة الرئيسية', enabled: false }), step({ key: 'admin-mode', tour: 'admin', order: 1, titleAr: 'وضع المدير' })]);
    renderPage(<TourStepsTab />);
    expect(await screen.findByText('أهلًا بك')).toBeInTheDocument();
    expect(within(rowOf(/أهلًا بك/)).getByText('ظاهرة')).toBeInTheDocument();
    expect(within(rowOf(/الصفحة الرئيسية/)).getByText('موقوفة')).toBeInTheDocument();
    expect(within(rowOf(/وضع المدير/)).getByText('جولة الإدارة')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'بحث في خطوات الجولة' }), { target: { value: 'المدير' } });
    await waitFor(() => expect(screen.queryByText('أهلًا بك')).not.toBeInTheDocument());
    expect(screen.getByText('وضع المدير')).toBeInTheDocument();
  });

  it('offers a reset only for a step that was changed', async () => {
    serve([step({}), step({ key: 'home', order: 2, titleAr: 'الصفحة الرئيسية', customised: true })]);
    renderPage(<TourStepsTab />);
    await screen.findByText('أهلًا بك');
    expect(within(rowOf(/أهلًا بك/)).queryByRole('button', { name: 'إعادة إلى الأصل' })).not.toBeInTheDocument();
    expect(within(rowOf(/الصفحة الرئيسية/)).getByRole('button', { name: 'إعادة إلى الأصل' })).toBeInTheDocument();
  });

  it('hides moving, resetting and exporting from who lacks those keys', async () => {
    serve([step({ customised: true })], [P.TourSettingsView, P.TourSettingsEdit]);
    renderPage(<TourStepsTab />);
    await screen.findByText('أهلًا بك');
    const row = rowOf(/أهلًا بك/);
    expect(within(row).getByRole('button', { name: 'تعديل' })).toBeInTheDocument();
    for (const name of ['قدّم الخطوة', 'أخّر الخطوة', 'إعادة إلى الأصل']) expect(within(row).queryByRole('button', { name })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تصدير' })).not.toBeInTheDocument();
  });

  it('disables a step in one click and enables it back, sending only the switch so its wording is never overwritten', async () => {
    const bodies: unknown[] = [];
    serve([step({ titleEn: 'Welcome!', bodyAr: 'نص' }), step({ key: 'home', order: 2, titleAr: 'الصفحة الرئيسية', enabled: false })]);
    server.use(http.put('*/api/tour-steps/:key/enabled', async ({ request, params }) => {
      bodies.push({ key: params.key, ...(await request.json() as object) });
      return HttpResponse.json(step({}));
    }));
    renderPage(<TourStepsTab />);
    await screen.findByText('أهلًا بك');
    // the buttons follow the person's permissions, which arrive after the rows: wait for them
    fireEvent.click(await within(rowOf(/أهلًا بك/)).findByRole('button', { name: 'تعطيل الخطوة' }));
    fireEvent.click(await within(rowOf(/الصفحة الرئيسية/)).findByRole('button', { name: 'تفعيل الخطوة' }));
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[0]).toEqual({ key: 'welcome', enabled: false });
    expect(bodies[1]).toEqual({ key: 'home', enabled: true });
  });

  it('hides the disable button from who cannot switch a step, even when they can edit its wording', async () => {
    serve([step({})], [P.TourSettingsView]);
    const view = renderPage(<TourStepsTab />);
    await screen.findByText('أهلًا بك');
    expect(within(rowOf(/أهلًا بك/)).queryByRole('button', { name: 'تعطيل الخطوة' })).not.toBeInTheDocument();
    view.unmount();

    serve([step({})], [P.TourSettingsView, P.TourSettingsEdit]);
    renderPage(<TourStepsTab />);
    await screen.findByText('أهلًا بك');
    expect(within(rowOf(/أهلًا بك/)).queryByRole('button', { name: 'تعطيل الخطوة' })).not.toBeInTheDocument();
  });

  it('shows the disable button to who holds the switch key alone', async () => {
    serve([step({})], [P.TourSettingsView, P.TourSettingsToggle]);
    renderPage(<TourStepsTab />);
    await screen.findByText('أهلًا بك');
    // The permissions arrive after the row: wait for the button, not for the row alone.
    expect(await within(rowOf(/أهلًا بك/)).findByRole('button', { name: 'تعطيل الخطوة' })).toBeInTheDocument();
  });

  it('opens a step with its wording in both languages', async () => {
    serve([step({ titleEn: 'Welcome!' })]);
    renderPage(<TourStepsTab />);
    fireEvent.click(await screen.findByText('أهلًا بك'));
    const dialog = await screen.findByRole('dialog', { name: 'أهلًا بك' });
    expect(within(dialog).getAllByRole('textbox', { name: 'العنوان' })).toHaveLength(2);
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Welcome!')).toBeInTheDocument();
    expect(TOUR_IDS).toContain('general');
  });
});
