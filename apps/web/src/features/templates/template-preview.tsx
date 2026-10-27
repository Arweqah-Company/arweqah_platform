import type { TemplateContent, TemplateKind, TemplateLang } from '@arweqah-platform/shared';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/lib/error-message';
import { useDebounced } from '@/shared/lib/use-debounced';
import { Alert } from '@/shared/ui';
import { useTemplatePreview } from './api';

/** What the message will look like, filled with example values; a problem with the wording (an unknown variable) shows here, before saving. */
export function TemplatePreview({ kind, templateKey, content, lang }: { kind: TemplateKind; templateKey: string; content: TemplateContent; lang: TemplateLang }) {
  const { t } = useTranslation('templates');
  const { t: tc } = useTranslation();
  const settled = useDebounced(content);
  const preview = useTemplatePreview(kind, templateKey, settled, lang);
  return (
    <section aria-label={t('preview.title')} className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 font-bold">{t('preview.title')}{preview.isFetching && <Loader2 className="size-4 animate-spin text-muted" aria-hidden />}</h3>
      {preview.error && <Alert tone="warning">{errorMessage(tc, preview.error)}</Alert>}
      {preview.data && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white text-ink">
          <p className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"><span className="text-muted">{t('preview.subject')}: </span>{preview.data.title}</p>
          <iframe title={t('preview.frame')} sandbox="" srcDoc={preview.data.html} className="h-96 w-full border-0 bg-white" />
        </div>
      )}
    </section>
  );
}
