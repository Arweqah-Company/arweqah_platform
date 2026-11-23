import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { NoticeFormDialog } from '../manage/notice-form-dialog';

function serve() {
  const account = me([{ key: 'notices.create', scope: 'own' }, { key: 'notices.submit', scope: 'own' }]);
  server.use(
    http.get('*/api/me', () => HttpResponse.json(account)),
    http.get('*/api/notices/options', () => HttpResponse.json({ channels: [{ code: 'hr', nameAr: 'الموارد البشرية', nameEn: 'Human resources', isActive: true }, { code: 'legal', nameAr: 'الشؤون القانونية', nameEn: 'Legal', isActive: true }], writableChannelCodes: ['hr'], authors: [] })),
    http.get('*/api/notices/audience/options', () =>
      HttpResponse.json({
        units: [{ id: 'u1', parentId: null, nameAr: 'الموارد البشرية', nameEn: 'Human resources unit' }],
        titles: [{ id: 't1', nameAr: 'محاسب', nameEn: 'Accountant', unitNameAr: 'المالية', unitNameEn: 'Finance' }],
        groups: [{ id: 'g1', nameAr: 'لجنة السلامة', nameEn: 'Safety committee', memberCount: 7 }],
      }),
    ),
    http.post('*/api/notices/audience/count', () => HttpResponse.json({ count: 120 })),
  );
}

describe('The notice form talks while the writer types (FR-167)', () => {
  it('shows the field errors as the writer types and keeps «Send for approval» off until the form is complete', async () => {
    serve();
    renderPage(<NoticeFormDialog mode="new" id={null} onClose={() => undefined} />);
    const title = await screen.findByLabelText(/العنوان بالعربية/);
    const send = await screen.findByRole('button', { name: 'إرسال للاعتماد' });
    expect(send).toBeDisabled();
    fireEvent.change(title, { target: { value: 'سياسة' } });
    fireEvent.change(title, { target: { value: '' } });
    fireEvent.blur(title);
    expect(await screen.findAllByText('هذا الحقل مطلوب.')).not.toHaveLength(0);
    expect(await screen.findByText('اختر النوع.')).toBeInTheDocument();
    fireEvent.change(title, { target: { value: 'سياسة السفر' } });
    fireEvent.change(screen.getByLabelText(/^النص/), { target: { value: 'نص السياسة' } });
    fireEvent.click(screen.getByRole('radio', { name: /سياسة تحتاج إقرارًا/ }));
    await waitFor(() => expect(send).toBeEnabled());
  });

  it('refuses a publish date in the past with its words', async () => {
    serve();
    renderPage(<NoticeFormDialog mode="new" id={null} onClose={() => undefined} />);
    const date = await screen.findByLabelText(/تاريخ النشر/);
    fireEvent.change(date, { target: { value: '2020-01-01' } });
    expect(await screen.findByText('تاريخ النشر لا يكون في الماضي')).toBeInTheDocument();
  });

  it('warns before closing with changes that were not saved', async () => {
    serve();
    const onClose = vi.fn();
    renderPage(<NoticeFormDialog mode="new" id={null} onClose={onClose} />);
    fireEvent.change(await screen.findByLabelText(/العنوان بالعربية/), { target: { value: 'مسودة' } });
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(await screen.findByText('تجاهل التغييرات؟')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('offers the units, titles and groups from the one options call, groups included for a writer without the groups key (FR-168)', async () => {
    serve();
    renderPage(<NoticeFormDialog mode="new" id={null} onClose={() => undefined} />);
    fireEvent.click(await screen.findByRole('radio', { name: /وحدات ومسميات ومجموعات/ }));
    expect(await screen.findByText('مجموعات الأشخاص')).toBeInTheDocument();
    expect(screen.getByText('الوحدات')).toBeInTheDocument();
    expect(screen.getByText('المسميات الوظيفية')).toBeInTheDocument();
  });

  it('offers only the enabled channels the person writes in, never every channel of every unit (FR-177)', async () => {
    serve();
    renderPage(<NoticeFormDialog mode="new" id={null} onClose={() => undefined} />);
    const select = await screen.findByRole('combobox', { name: /^القناة/ });
    await waitFor(() => expect(select).toHaveTextContent('الموارد البشرية')); // the only one the person writes in: chosen for them
    expect(select).toBeDisabled();
    expect(screen.queryByText('الشؤون القانونية')).not.toBeInTheDocument();
  });
});
