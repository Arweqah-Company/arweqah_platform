import type { CareerContent } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';

/** A titled block of a section (a white rounded card). */
export function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h3 className="mb-2 font-heading text-base font-bold text-fg">{title}</h3>
      {children}
    </section>
  );
}

/** The indicators of the job; the governing one is marked in words. */
export function Indicators({ kpis }: { kpis: CareerContent['kpis'] }) {
  const { t } = useTranslation('career-profile');
  return (
    <ul className="flex list-disc flex-col gap-1.5 ps-5 text-fg">
      {kpis.map((k, i) => (
        <li key={`${i}-${k.text}`}>
          {k.text} {k.governing && <Badge tone="info">{t('description.governing')}</Badge>}
        </li>
      ))}
    </ul>
  );
}

/** The responsibilities, each a closed block with its tasks (the first is open). */
export function Responsibilities({ groups }: { groups: CareerContent['responsibilities'] }) {
  return (
    <div className="flex flex-col gap-2">
      {groups.map((g, i) => (
        <details key={`${i}-${g.title}`} open={i === 0} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
          <summary className="cursor-pointer font-medium text-fg">{g.title}</summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-fg">
            {g.tasks.map((task, n) => (
              <li key={`${n}-${task}`}>{task}</li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
