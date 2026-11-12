import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useMe } from '@/core/auth/session';
import { usePermissions } from '@/core/permissions/can';
import { useDebounced } from '@/shared/lib/use-debounced';
import { Alert, Badge, PageHeader } from '@/shared/ui';
import { plainText, visibleSections, type Manual, type ManualSection } from './docs-access';
import { ManualBlocks } from './docs-blocks';
import { DocsNav } from './docs-nav';
import './docs-prose.css';

const loaders: Record<string, () => Promise<{ default: unknown }>> = {
  ar: () => import('./content/manual.ar.json'),
  en: () => import('./content/manual.en.json'),
};
const NONE: readonly string[] = [];

/** The sections this person may read (permission + page visibility), narrowed by the search words. */
function useSections(manual: Manual | undefined, term: string): ManualSection[] {
  const { can } = usePermissions();
  const hidden = useMe().data?.hiddenPages ?? NONE;
  const mine = useMemo(() => visibleSections(manual?.sections ?? [], can, hidden), [manual, can, hidden]);
  return useMemo(() => (term ? mine.filter((s) => plainText(s).includes(term)) : mine), [mine, term]);
}

export function DocsPage() {
  const { t, i18n } = useTranslation('docs');
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const manual = useQuery({ queryKey: ['manual', lang], queryFn: async () => (await loaders[lang]!()).default as Manual, staleTime: Infinity });
  const shown = useSections(manual.data, useDebounced(query.trim().toLowerCase(), 150));
  const current = shown.find((s) => s.id === params.get('s')) ?? shown[0];
  const setParam = (key: string, value: string) => setParams((p) => ({ ...Object.fromEntries(p), [key]: value }), { replace: true });

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      {manual.isError && <Alert tone="danger">{t('loadFailed')}</Alert>}
      {manual.data && (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]" data-tour="main-list">
          <DocsNav groups={manual.data.groups} shown={shown} currentId={current?.id} query={query} onQuery={(q) => setParam('q', q)} onSelect={(id) => setParam('s', id)} />
          <article className="manual min-w-0 rounded-3xl border border-neutral-200 bg-white p-6">
            {current ? <Section section={current} /> : <p className="text-muted">{t('empty')}</p>}
          </article>
        </div>
      )}
    </>
  );
}

function Section({ section }: { section: ManualSection }) {
  const { t } = useTranslation('docs');
  return (
    <>
      {section.adminMode && <Badge tone="info">{t('adminMode')}</Badge>}
      <h2>{section.title}</h2>
      <ManualBlocks blocks={section.blocks} />
    </>
  );
}
