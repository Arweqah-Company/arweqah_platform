import type { TitleFileResultDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { TitleFileDialog } from './title-file-dialog';

vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

const counts = { indicators: 3, responsibilities: 4, tasks: 12, ladderLevels: 7, pathSteps: 4, competencies: 13, badges: 4, learningPeriods: 3, learningUnits: 30, learningMinutes: 2358, requiredItems: 6 };
const result = (over: Partial<TitleFileResultDto>): TitleFileResultDto => ({ dryRun: true, saved: false, version: null, counts, problems: [], codeInFile: null, ignored: [], ...over });

function open(answer: (dryRun: boolean) => { status?: number; body: unknown }) {
  const sent: { dryRun: boolean; text: string }[] = [];
  server.use(
    http.post('*/api/career/titles/t1/file', async ({ request }) => {
      const body = (await request.json()) as { dryRun: boolean; text: string };
      sent.push(body);
      const { status = 200, body: json } = answer(body.dryRun);
      return HttpResponse.json(json as object, { status });
    }),
  );
  const closed = vi.fn();
  renderPage(<TitleFileDialog titleId="t1" titleName="منسق الاستقطاب" onClose={closed} />);
  return { sent, closed };
}

const paste = (text: string) => fireEvent.change(screen.getByLabelText('أو الصق نص الملف'), { target: { value: text } });

describe('The title-file dialog (FR-113)', () => {
  it('reports the counts and what needs review, and keeps «Save» off until nothing is left to fix', async () => {
    open(() => ({ body: result({ problems: ['summary_missing', 'code_mismatch'], ignored: ['التالي'] }) }));
    expect(screen.getByRole('button', { name: 'حفظ المحتوى المستخرج' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'استخراج' })).toBeDisabled();
    paste('نص الملف');
    fireEvent.click(screen.getByRole('button', { name: 'استخراج' }));
    expect(await screen.findByText('أجزاء تحتاج مراجعة قبل الحفظ:')).toBeInTheDocument();
    expect(screen.getByText('ملخص الوظيفة ناقص')).toBeInTheDocument();
    expect(screen.getByText('رمز المسمى في الملف لا يطابق رمز هذا المسمى')).toBeInTheDocument();
    expect(screen.getByText('المؤشرات: 3')).toBeInTheDocument();
    expect(screen.getByText(/تجاهل الكود نصوصًا ليست من المحتوى: التالي/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حفظ المحتوى المستخرج' })).toBeDisabled();
  });

  it('saves with dryRun false once the file is clean, and closes', async () => {
    const { sent, closed } = open((dry) => ({ body: result({ dryRun: dry, saved: !dry, version: dry ? null : 4 }) }));
    paste('نص سليم');
    fireEvent.click(screen.getByRole('button', { name: 'استخراج' }));
    expect(await screen.findByText('كل الأجزاء سليمة ويمكن حفظها.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'حفظ المحتوى المستخرج' }));
    await waitFor(() => expect(closed).toHaveBeenCalled());
    expect(sent).toEqual([{ text: 'نص سليم', dryRun: true }, { text: 'نص سليم', dryRun: false }]);
  });

  it('forgets the findings when the text changes, so an old result is never saved for new text', async () => {
    open(() => ({ body: result({}) }));
    paste('نص أول');
    fireEvent.click(screen.getByRole('button', { name: 'استخراج' }));
    await screen.findByText('كل الأجزاء سليمة ويمكن حفظها.');
    paste('نص ثان');
    expect(screen.queryByText('كل الأجزاء سليمة ويمكن حفظها.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حفظ المحتوى المستخرج' })).toBeDisabled();
  });

  it('reads a txt file dropped on the box, and says when a file cannot be read', async () => {
    const { sent } = open(() => ({ body: result({}) }));
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['ملخص الوظيفة\nنص'], 'title.txt')] } });
    expect(await screen.findByText('كل الأجزاء سليمة ويمكن حفظها.')).toBeInTheDocument();
    expect(sent[0]).toEqual({ text: 'ملخص الوظيفة\nنص', dryRun: true });
    fireEvent.change(input, { target: { files: [new File(['not a document'], 'broken.pdf')] } });
    expect(await screen.findByText('تعذّرت قراءة الملف. جرّب لصق نصه.')).toBeInTheDocument();
  });

  it('refuses a save the server refused (422) and keeps the dialog open', async () => {
    const { closed } = open((dry) => (dry ? { body: result({}) } : { status: 422, body: { statusCode: 422, code: 'TITLE_FILE_NEEDS_REVIEW', message: 'x', details: { problems: ['summary_missing'] } } }));
    paste('نص');
    fireEvent.click(screen.getByRole('button', { name: 'استخراج' }));
    await screen.findByText('كل الأجزاء سليمة ويمكن حفظها.');
    fireEvent.click(screen.getByRole('button', { name: 'حفظ المحتوى المستخرج' }));
    expect(await screen.findByText('لم يُحفظ الملف: يحتاج مراجعة.')).toBeInTheDocument();
    expect(closed).not.toHaveBeenCalled();
  });
});
