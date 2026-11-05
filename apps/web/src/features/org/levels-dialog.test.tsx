import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { levelsDto } from '../../../test/org-fixtures';
import { server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { LevelsDialog } from './levels-dialog';

interface Saved { types?: { levels: { id?: string; nameAr: string }[] }; rules?: { rules: Record<string, string[]> } }

const open = () => {
  const onClose = vi.fn();
  const saved: Saved = {};
  server.use(
    http.get('*/api/org/levels', () => HttpResponse.json(levelsDto)),
    http.put('*/api/org/levels', async ({ request }) => {
      saved.types = (await request.json()) as Saved['types'];
      // The server names the added type.
      const added = (saved.types?.levels ?? []).filter((l) => !l.id).map((l, i) => ({ id: `lv-x${i}`, key: `x${i}`, nameAr: l.nameAr, nameEn: l.nameAr, sortOrder: 9 + i, acceptsTitles: true, isBuiltIn: false, tone: 'unit', codeSlot: 4, unitsCount: 0 }));
      return HttpResponse.json({ levels: [...levelsDto.levels, ...added], rules: levelsDto.rules });
    }),
    http.put('*/api/org/levels/rules', async ({ request }) => {
      saved.rules = (await request.json()) as Saved['rules'];
      return HttpResponse.json(levelsDto);
    }),
  );
  renderPage(<LevelsDialog onClose={onClose} />);
  return { onClose, saved };
};
const pair = (parent: string, child: string) => screen.getByLabelText(`الأب ${parent}، الابن ${child}`);

describe('Structure divisions window (FR-96)', () => {
  it('lists the five built-in types with their names, counts and the «takes titles» box (a sector never takes them)', async () => {
    open();
    expect(await screen.findByDisplayValue('قطاع')).toBeInTheDocument();
    expect(screen.getAllByText('أساسي')).toHaveLength(5);
    expect(screen.getByLabelText('يقبل مسميات وموظفين: قطاع')).toBeDisabled();
    expect(screen.getByLabelText('يقبل مسميات وموظفين: إدارة')).toBeChecked();
    expect(screen.getByRole('button', { name: 'حفظ التقسيمات' })).toBeEnabled();
  });

  it('draws the parent and child table from the saved rules, with the fixed rules unticked and disabled', async () => {
    open();
    await screen.findByDisplayValue('قطاع');
    expect(pair('أروقة الريادة (المجموعة)', 'قطاع')).toBeChecked();
    expect(pair('أروقة الريادة (المجموعة)', 'قسم')).not.toBeChecked();
    expect(pair('قسم', 'مكتب')).toBeChecked();
    expect(pair('إدارة', 'قطاع')).toBeDisabled(); // a sector sits only under the group
    expect(pair('مكتب', 'مكتب')).toBeDisabled(); // no office under an office
  });

  it('ticks a pair, and «all» ticks a whole row (never a fixed pair), and clears it when it was full', async () => {
    open();
    await screen.findByDisplayValue('قطاع');
    fireEvent.click(pair('وحدة', 'وحدة'));
    expect(pair('وحدة', 'وحدة')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'كل الأنواع تحت قسم' }));
    expect(pair('قسم', 'قسم')).toBeChecked();
    expect(pair('قسم', 'قطاع')).toBeDisabled();
    expect(pair('قسم', 'قطاع')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'كل الأنواع تحت قسم' }));
    expect(pair('قسم', 'قسم')).not.toBeChecked();
  });

  it('adds a division, asks for both names as the person types and refuses a repeated Arabic name', async () => {
    open();
    await screen.findByDisplayValue('قطاع');
    fireEvent.click(screen.getByRole('button', { name: 'إضافة تقسيم' }));
    const save = screen.getByRole('button', { name: 'حفظ التقسيمات' });
    expect(save).toBeDisabled();
    const names = screen.getAllByLabelText('الاسم بالعربي');
    const added = names[names.length - 1] as HTMLElement;
    fireEvent.blur(added);
    expect(await screen.findByText('الاسم بالعربي مطلوب.')).toBeInTheDocument();
    fireEvent.change(added, { target: { value: 'قطاع' } });
    expect(await screen.findByText('الاسم مكرر.')).toBeInTheDocument();
    fireEvent.change(added, { target: { value: 'فرع' } });
    const english = screen.getAllByLabelText('الاسم بالإنجليزي');
    fireEvent.change(english[english.length - 1] as HTMLElement, { target: { value: 'Branch' } });
    await waitFor(() => expect(save).toBeEnabled());
  });

  it('removes an added division, but not a built-in one or one that units use', async () => {
    open();
    await screen.findByDisplayValue('قطاع');
    expect(screen.queryByRole('button', { name: /^حذف التقسيم/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إضافة تقسيم' }));
    const remove = screen.getByRole('button', { name: 'حذف التقسيم: تقسيم جديد' });
    expect(remove).toBeEnabled();
    fireEvent.click(remove);
    expect(screen.queryByRole('button', { name: /^حذف التقسيم/ })).not.toBeInTheDocument();
  });

});

describe('Structure divisions window: saving (FR-96)', () => {
  it('saves the types first and then the table, with the key the server gave to the added division', async () => {
    const { saved, onClose } = open();
    await screen.findByDisplayValue('قطاع');
    fireEvent.click(screen.getByRole('button', { name: 'إضافة تقسيم' }));
    const names = screen.getAllByLabelText('الاسم بالعربي');
    fireEvent.change(names[names.length - 1] as HTMLElement, { target: { value: 'فرع' } });
    const english = screen.getAllByLabelText('الاسم بالإنجليزي');
    fireEvent.change(english[english.length - 1] as HTMLElement, { target: { value: 'Branch' } });
    fireEvent.click(pair('أروقة الريادة (المجموعة)', 'فرع'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'حفظ التقسيمات' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التقسيمات' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(saved.types?.levels).toHaveLength(6);
    expect(saved.types?.levels.find((l) => !l.id)).toMatchObject({ nameAr: 'فرع', nameEn: 'Branch', acceptsTitles: true });
    expect(saved.rules?.rules.root).toContain('x0');
    expect(saved.rules?.rules.x0).toEqual([]);
    expect(Object.keys(saved.rules?.rules ?? {})).toContain('office');
  });

  it('shows the API refusal in the window', async () => {
    open();
    server.use(http.put('*/api/org/levels', () => HttpResponse.json({ statusCode: 422, code: 'INVALID_ORG_RULES', message: 'Invalid rules' }, { status: 422 })));
    await screen.findByDisplayValue('قطاع');
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التقسيمات' }));
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
  });
});
