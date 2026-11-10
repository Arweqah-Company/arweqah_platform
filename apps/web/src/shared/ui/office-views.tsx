import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { docxToFragment, xlsxToSheets, type PreviewSheet } from '../lib/office-preview';
import { Alert } from './alert';
import { Tabs } from './tabs';

/** The result of reading a file in the browser: still loading, failed, or ready. */
function useRead<T>(blob: Blob, read: (blob: Blob) => Promise<T>): { value: T | null; failed: boolean } {
  const [state, setState] = useState<{ value: T | null; failed: boolean }>({ value: null, failed: false });
  useEffect(() => {
    let live = true;
    read(blob).then(
      (value) => live && setState({ value, failed: false }),
      () => live && setState({ value: null, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [blob, read]);
  return state;
}

const DOCX_STYLE = '[&_a]:text-link [&_a]:underline [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:ps-6 [&_table]:my-3 [&_table]:border-collapse [&_td]:border [&_td]:border-neutral-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-neutral-200 [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:ps-6';

/** Word, drawn from the file in the browser (an approximation). The page is built from a sanitized DOM fragment, never from an HTML string. */
export function DocxView({ blob }: { blob: Blob }) {
  const { t } = useTranslation();
  const { value, failed } = useRead(blob, docxToFragment);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (value) box.current?.replaceChildren(value.cloneNode(true));
  }, [value]);
  if (failed) return <Alert>{t('files.unreadable')}</Alert>;
  return (
    <>
      {value === null && <p role="status" className="text-sm text-muted">{t('files.loading')}</p>}
      <div ref={box} className={`max-h-[60vh] overflow-auto rounded-xl border border-neutral-200 bg-white p-5 text-sm leading-7 ${DOCX_STYLE} ${value === null ? 'hidden' : ''}`} />
    </>
  );
}

function SheetTable({ sheet }: { sheet: PreviewSheet }) {
  const { t } = useTranslation();
  if (sheet.rows.length === 0) return <p className="text-sm text-muted">{t('files.emptySheet')}</p>;
  return (
    <div className="flex flex-col gap-2">
      {sheet.truncated && <Alert tone="warning">{t('files.truncated')}</Alert>}
      <div className="max-h-[50vh] overflow-auto rounded-xl border border-neutral-200">
        <table className="w-full border-collapse text-sm" dir="auto">
          <tbody>
            {sheet.rows.map((row, r) => (
              <tr key={r} className={r === 0 ? 'sticky top-0 bg-neutral-50 font-bold' : undefined}>
                {row.map((cell, c) => <td key={c} className="border border-neutral-200 px-2 py-1 align-top">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Excel, drawn from the file in the browser: one tab per sheet, every cell as text. */
export function WorkbookView({ blob }: { blob: Blob }) {
  const { t } = useTranslation();
  const { value, failed } = useRead(blob, xlsxToSheets);
  const [chosen, setChosen] = useState(0);
  if (failed) return <Alert>{t('files.unreadable')}</Alert>;
  if (value === null) return <p role="status" className="text-sm text-muted">{t('files.loading')}</p>;
  const sheet = value[chosen] ?? value[0];
  if (!sheet) return <p className="text-sm text-muted">{t('files.emptySheet')}</p>;
  return (
    <div className="flex flex-col">
      {value.length > 1 && <Tabs tabs={value.map((s, i) => ({ id: String(i), label: s.name }))} value={String(chosen)} label={t('files.sheets')} onChange={(id) => setChosen(Number(id))} />}
      <SheetTable sheet={sheet} />
    </div>
  );
}
