import type { ReadinessDto } from '@arweqah-platform/shared';
import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';

function Row({ ok, label }: { ok: boolean; label: string }) {
  const { t } = useTranslation('performance');
  return (
    <li className="flex items-center gap-2">
      {ok ? <Check className="size-4 text-success" aria-hidden /> : <X className="size-4 text-danger" aria-hidden />}
      <span className="text-fg">{label}</span>
      <span className="sr-only">{ok ? t('readiness.yes') : t('readiness.no')}</span>
    </li>
  );
}

/** The checklist before opening: each stage's template, the grade scale, the fiscal card, and how many catalog items there are. */
export function ReadinessCard({ readiness }: { readiness: ReadinessDto }) {
  const { t } = useTranslation('performance');
  return (
    <section aria-labelledby="readiness-title" className="flex flex-col gap-3 rounded-3xl border border-neutral-200 bg-white p-4" data-tour="performance-readiness">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="readiness-title" className="font-heading text-lg font-bold text-fg">{t('readiness.title')}</h2>
        <Badge tone={readiness.ready ? 'success' : 'warning'}>{t(readiness.ready ? 'readiness.ready' : 'readiness.notReady')}</Badge>
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {readiness.stages.map((s) => <Row key={s.stage} ok={s.ready} label={t('readiness.stage', { stage: s.stage })} />)}
        <Row ok={readiness.scale} label={t('readiness.scale')} />
        <Row ok={readiness.fiscal} label={t('readiness.fiscal')} />
      </ul>
      <p className="text-sm text-muted">{t('readiness.catalog', { count: readiness.catalogItems })}</p>
    </section>
  );
}
