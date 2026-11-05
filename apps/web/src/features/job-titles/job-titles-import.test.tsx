import { CorePermission, type ImportJobTitlesInput, type TitleImportResultDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { orgTree } from '../../../test/org-fixtures';
import { renderPage } from '../../../test/render';
import { ImportDialog } from '@/shared/data-exchange/import-dialog';
import { useTitlesImport } from './job-titles-import';

function Harness() {
  const importing = useTitlesImport();
  return <ImportDialog open onOpenChange={() => undefined} {...importing} />;
}

const HEADER = 'رمز الوحدة,الاسم بالعربي,الاسم بالإنجليزي,الدرجة,المسار,رمز جهة الرفع,المسؤوليات (العربية)';
const upload = (lines: string[]) => fireEvent.change(document.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [new File([[HEADER, ...lines].join('\r\n')], 'titles.csv')] } });

/** The server's answer to the file: the first sent row is made, the second is refused for its unit. */
const answer = (dryRun: boolean): TitleImportResultDto => ({
  dryRun,
  created: 1,
  updated: 0,
  unchanged: 0,
  rejected: 1,
  rows: [{ row: 1, status: 'created', code: 'OPS.03.03.01-L7P-01', reasons: [] }, { row: 2, status: 'rejected', code: null, reasons: ['unit_not_found'] }],
});

function serve(posted: ImportJobTitlesInput[]) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me([{ key: CorePermission.OrgViewFull, scope: 'all' }]))),
    http.get('*/api/org/tree', () => HttpResponse.json(orgTree())),
    http.post('*/api/org/job-titles/bulk', async ({ request }) => {
      const body = (await request.json()) as ImportJobTitlesInput;
      posted.push(body);
      return HttpResponse.json(answer(body.dryRun));
    }),
  );
}

describe('Import of job titles from a file (FR-107)', () => {
  it('previews with the server’s dry run: the rows it would refuse come back with the sheet row number and a reason in words', async () => {
    const posted: ImportJobTitlesInput[] = [];
    serve(posted);
    renderPage(<Harness />);
    upload(['OPS.03.03.01,محاسب,Accountant,L7,مهني,,إعداد القوائم|مراجعة القيود', 'OPS.99.00.00,مدقق,Auditor,7,P,,', 'OPS.03.03.01,,Clerk,5,M,,', 'OPS.03.03.01,كاتب,Clerk,L12,M,,']);
    expect(await screen.findByText(/1 صف سليم، 3 صف فيه أخطاء من أصل 4/)).toBeInTheDocument();
    expect(screen.getByText(/مسميات جديدة: 1 · مُعدَّلة: 0 · بلا تغيير: 0/)).toBeInTheDocument();
    expect(screen.getByText(/الصف 3/).closest('li')).toHaveTextContent('لا توجد وحدة بهذا الرمز.'); // the server's reason, at the row of the sheet
    expect(screen.getByText(/الصف 4/).closest('li')).toHaveTextContent('الاسم بالعربي'); // the client's own check: a name is missing
    expect(screen.getByText(/الصف 5/)).toBeInTheDocument(); // grade 12 is not a grade
    // Only the rows that passed the client's check were sent, and as a dry run.
    expect(posted).toHaveLength(1);
    expect(posted[0]?.dryRun).toBe(true);
    expect(posted[0]?.rows).toHaveLength(2);
    expect(posted[0]?.rows[0]).toMatchObject({ unitCode: 'OPS.03.03.01', nameAr: 'محاسب', grade: 7, track: 'P', content: { responsibilities: { ar: ['إعداد القوائم', 'مراجعة القيود'], en: [] } } });
  });

  it('imports with one call, then reports what the server still refused', async () => {
    const posted: ImportJobTitlesInput[] = [];
    serve(posted);
    // The preview let both rows through; by the time of the import the second one is refused.
    server.use(http.post('*/api/org/job-titles/bulk', async ({ request }) => {
      const body = (await request.json()) as ImportJobTitlesInput;
      posted.push(body);
      const accepted: TitleImportResultDto = { ...answer(true), rejected: 0, created: 2, rows: [{ row: 1, status: 'created', code: 'A', reasons: [] }, { row: 2, status: 'created', code: 'B', reasons: [] }] };
      return HttpResponse.json(body.dryRun ? accepted : answer(false));
    }));
    renderPage(<Harness />);
    upload(['OPS.03.03.01,محاسب,Accountant,L7,مهني,,', 'OPS.99.00.00,مدقق,Auditor,7,P,,']);
    fireEvent.click(await screen.findByRole('button', { name: 'استيراد 2 صف' }));
    expect(await screen.findByText('تم استيراد 1 صف، وفشل 1.')).toBeInTheDocument();
    expect(screen.getByText(/الصف 3/).closest('li')).toHaveTextContent('لا توجد وحدة بهذا الرمز.');
    expect(posted.map((p) => p.dryRun)).toEqual([true, false]);
    expect(posted[1]?.rows).toHaveLength(2); // the whole file: a row may report to another row of it
    expect(screen.getByRole('button', { name: 'تنزيل تقرير الأخطاء' })).toBeInTheDocument();
  });

  it('shows the whole import as failed when the call itself fails', async () => {
    const posted: ImportJobTitlesInput[] = [];
    serve(posted);
    server.use(http.post('*/api/org/job-titles/bulk', async ({ request }) => {
      const body = (await request.json()) as ImportJobTitlesInput;
      return body.dryRun ? HttpResponse.json({ ...answer(true), rejected: 0, rows: [{ row: 1, status: 'created', code: 'A', reasons: [] }, { row: 2, status: 'created', code: 'B', reasons: [] }] }) : HttpResponse.json({ statusCode: 403, code: 'FORBIDDEN', message: 'no' }, { status: 403 });
    }));
    renderPage(<Harness />);
    upload(['OPS.03.03.01,محاسب,Accountant,L7,مهني,,', 'OPS.03.03.01,مدقق,Auditor,7,P,,']);
    fireEvent.click(await screen.findByRole('button', { name: 'استيراد 2 صف' }));
    expect(await screen.findByText('تم استيراد 0 صف، وفشل 2.')).toBeInTheDocument();
  });
});

describe('The template of the titles import (FR-107)', () => {
  it('stars the required columns and offers drop-downs from the system’s lists: units that take titles, grades, tracks', async () => {
    serve([]);
    function Probe() {
      const { columns } = useTitlesImport();
      return <pre data-testid="columns">{JSON.stringify(columns)}</pre>;
    }
    renderPage(<Probe />);
    const read = () => JSON.parse(screen.getByTestId('columns').textContent ?? '[]') as ReturnType<typeof useTitlesImport>['columns'];
    await waitFor(() => expect(read().find((c) => c.id === 'unitCode')?.options?.length).toBeGreaterThan(0));
    const columns = read();
    const byId = Object.fromEntries(columns.map((c) => [c.id, c]));
    expect(columns.filter((c) => c.required).map((c) => c.id)).toEqual(['nameAr', 'nameEn']);
    expect(byId.unitCode?.options).toEqual(['OPS.09.00.00', 'OPS.03.00.00', 'OPS.03.01.00', 'OPS.03.01.01']); // a sector takes no titles
    expect(byId.grade?.options).toEqual(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9']);
    expect(byId.track?.options).toEqual(['إدارة', 'مهني', 'مشاريع', 'استشاري', 'مساندة']);
    expect(byId.responsibilitiesEn?.header).toBe('المسؤوليات (English)');
  });
});
