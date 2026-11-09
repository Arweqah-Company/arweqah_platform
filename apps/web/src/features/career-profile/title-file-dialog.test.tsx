import { CorePermission, type TitleFileResultDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { careerContent } from '../../../test/career-fixtures';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { TitleFileDialog } from './title-file-dialog';

vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

const counts = { indicators: 3, responsibilities: 4, tasks: 12, ladderLevels: 7, pathSteps: 4, competencies: 13, badges: 4, learningPeriods: 3, learningUnits: 30, learningMinutes: 2358, requiredItems: 6 };
const result = (over: Partial<TitleFileResultDto>): TitleFileResultDto => ({ dryRun: true, saved: false, version: null, counts, problems: [], codeInFile: null, ignored: [], source: 'rules', content: null, ungrounded: [], aiAvailable: false, ...over });

function open(answer: (dryRun: boolean) => { status?: number; body: unknown }, keys: string[] = []) {
  const sent: { dryRun: boolean; text: string }[] = [];
  server.use(
    http.post('*/api/career/titles/t1/file', async ({ request }) => {
      const body = (await request.json()) as { dryRun: boolean; text: string };
      sent.push(body);
      const { status = 200, body: json } = answer(body.dryRun);
      return HttpResponse.json(json as object, { status });
    }),
  );
  server.use(http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))));
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

  it('says why «Save» is off: before the file is checked, and when parts need review (with both title codes when they differ)', async () => {
    open(() => ({ body: result({ problems: ['code_mismatch'], codeInFile: 'OPS.01.01.01-L9P-01' }) }));
    expect(screen.getByText(/يُفتح الحفظ بعد فحص الملف/)).toBeInTheDocument();
    paste('نص');
    fireEvent.click(screen.getByRole('button', { name: 'استخراج' }));
    expect(await screen.findByText(/الحفظ مغلق لأن في الملف أجزاء تحتاج مراجعة/)).toBeInTheDocument();
    expect(screen.getByText(/OPS\.01\.01\.01-L9P-01 ≠ —/)).toBeInTheDocument();
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

describe('analysis with AI (FR-127)', () => {
  const AI = [CorePermission.CareerTitlefileAi];
  const placed = (over: Partial<TitleFileResultDto> = {}) => result({ source: 'ai', content: careerContent, aiAvailable: true, ...over });

  /** The ordinary reading finds a problem; the AI route and the confirm route answer as the server does. */
  function openWithAi(keys: string[], ai: { status?: number; body: unknown } = { body: placed() }) {
    const calls: { url: string; body: unknown }[] = [];
    server.use(
      http.post('*/api/career/titles/t1/file/ai', async ({ request }) => {
        calls.push({ url: 'ai', body: await request.json() });
        return HttpResponse.json(ai.body as object, { status: ai.status ?? 200 });
      }),
      http.post('*/api/career/titles/t1/file/confirm', async ({ request }) => {
        calls.push({ url: 'confirm', body: await request.json() });
        return HttpResponse.json({ version: 5 });
      }),
    );
    const opened = open(() => ({ body: result({ problems: ['summary_missing'], aiAvailable: true }) }), keys);
    paste('ملف بترتيب آخر');
    fireEvent.click(screen.getByRole('button', { name: 'استخراج' }));
    return { ...opened, calls };
  }

  it('FR-127: offers the AI only to a person with its key, and only when the ordinary reading found something to fix', async () => {
    openWithAi([]);
    expect(await screen.findByText('أجزاء تحتاج مراجعة قبل الحفظ:')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حلّل بالذكاء الاصطناعي' })).not.toBeInTheDocument();
  });

  it('FR-127: does not offer the AI when no service is switched on or the file is clean', async () => {
    open(() => ({ body: result({ problems: ['summary_missing'], aiAvailable: false }) }), AI);
    paste('نص');
    fireEvent.click(screen.getByRole('button', { name: 'استخراج' }));
    expect(await screen.findByText('أجزاء تحتاج مراجعة قبل الحفظ:')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حلّل بالذكاء الاصطناعي' })).not.toBeInTheDocument();
  });

  it('FR-127: sends the text to the AI on a click (with the notice that it leaves the platform) and shows its reading marked as such, with the texts to check', async () => {
    const { calls } = openWithAi(AI, { body: placed({ ungrounded: ['مهمة اخترعها النموذج'] }) });
    expect(await screen.findByText(/سيُرسل نص الملف إلى خدمة الذكاء الاصطناعي/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'حلّل بالذكاء الاصطناعي' }));
    expect(await screen.findByText('رتّبه الذكاء الاصطناعي: راجعه قبل الحفظ')).toBeInTheDocument();
    expect(screen.getByText('مهمة اخترعها النموذج')).toBeInTheDocument();
    expect(screen.getByText('كل الأجزاء سليمة ويمكن حفظها.')).toBeInTheDocument();
    expect(calls).toEqual([{ url: 'ai', body: { text: 'ملف بترتيب آخر' } }]);
  });

  it('FR-127: saves the reviewed content with confirm, never by asking the AI again', async () => {
    const { calls, closed } = openWithAi(AI);
    fireEvent.click(await screen.findByRole('button', { name: 'حلّل بالذكاء الاصطناعي' }));
    await screen.findByText('رتّبه الذكاء الاصطناعي: راجعه قبل الحفظ');
    fireEvent.click(screen.getByRole('button', { name: 'حفظ المحتوى المستخرج' }));
    await waitFor(() => expect(closed).toHaveBeenCalled());
    expect(calls).toEqual([{ url: 'ai', body: { text: 'ملف بترتيب آخر' } }, { url: 'confirm', body: { content: careerContent } }]);
  });

  it('FR-127: keeps «Save» off while the AI\'s reading still has something to fix', async () => {
    openWithAi(AI, { body: placed({ problems: ['code_mismatch'] }) });
    fireEvent.click(await screen.findByRole('button', { name: 'حلّل بالذكاء الاصطناعي' }));
    await screen.findByText('رتّبه الذكاء الاصطناعي: راجعه قبل الحفظ');
    expect(screen.getByRole('button', { name: 'حفظ المحتوى المستخرج' })).toBeDisabled();
  });

  it('FR-127: says in words why the AI could not answer, and keeps the ordinary findings', async () => {
    openWithAi(AI, { status: 502, body: { statusCode: 502, code: 'AI_UNAVAILABLE', message: 'x' } });
    fireEvent.click(await screen.findByRole('button', { name: 'حلّل بالذكاء الاصطناعي' }));
    expect(await screen.findByText('لم تعطِ خدمة الذكاء الاصطناعي إجابة صالحة. حاول مرة أخرى.')).toBeInTheDocument();
    expect(screen.getByText('أجزاء تحتاج مراجعة قبل الحفظ:')).toBeInTheDocument();
  });
});
