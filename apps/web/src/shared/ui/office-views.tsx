import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { csvToSheets, docxToFragment, pptxToSlides, xlsxToSheets, type PreviewSheet, type PreviewSlide } from '../lib/office-preview';
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

/** A CSV, drawn as one table of text cells. */
export function CsvView({ blob }: { blob: Blob }) {
  const { t } = useTranslation();
  const { value, failed } = useRead(blob, csvToSheets);
  if (failed) return <Alert>{t('files.unreadable')}</Alert>;
  if (value === null) return <p role="status" className="text-sm text-muted">{t('files.loading')}</p>;
  return <SheetTable sheet={value[0] as PreviewSheet} />;
}

/** The picture addresses of a slide, released when the slide leaves the screen. */
function useObjectUrls(blobs: Blob[]): string[] {
  const urls = useMemo(() => blobs.map((b) => URL.createObjectURL(b)), [blobs]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return urls;
}

function SlideCard({ slide, name }: { slide: PreviewSlide; name: string }) {
  const { t } = useTranslation();
  const urls = useObjectUrls(slide.images);
  const [title, ...rest] = slide.lines;
  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="mb-2 text-xs font-medium text-muted">{t('files.slideNumber', { number: slide.number })}</p>
      {title && <h3 className="text-base font-bold">{title}</h3>}
      {rest.length > 0 && <div className="mt-2 flex flex-col gap-1 text-sm leading-6">{rest.map((line, i) => <p key={i}>{line}</p>)}</div>}
      {urls.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{urls.map((u) => <img key={u} src={u} alt={t('files.slideImage', { number: slide.number, name })} className="max-h-48 max-w-full rounded-lg border border-neutral-200 object-contain" />)}</div>}
      {slide.moreImages && <p className="mt-2 text-xs text-muted">{t('files.moreImages')}</p>}
      {!title && urls.length === 0 && <p className="text-sm text-muted">{t('files.emptySlide')}</p>}
    </li>
  );
}

/** PowerPoint, drawn from the file in the browser: every slide as a card with its text and pictures (an approximation). */
export function DeckView({ blob, name }: { blob: Blob; name: string }) {
  const { t } = useTranslation();
  const { value, failed } = useRead(blob, pptxToSlides);
  if (failed) return <Alert>{t('files.unreadable')}</Alert>;
  if (value === null) return <p role="status" className="text-sm text-muted">{t('files.loading')}</p>;
  if (value.slides.length === 0) return <p className="text-sm text-muted">{t('files.emptyDeck')}</p>;
  return (
    <div className="flex flex-col gap-3">
      {value.truncated && <Alert tone="warning">{t('files.deckTruncated', { count: value.slides.length })}</Alert>}
      <ol aria-label={name} className="flex max-h-[60vh] flex-col gap-3 overflow-auto">
        {value.slides.map((slide) => <SlideCard key={slide.number} slide={slide} name={name} />)}
      </ol>
    </div>
  );
}
