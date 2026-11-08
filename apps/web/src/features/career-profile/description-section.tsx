import type { CareerContent } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Indicators, Part, Responsibilities } from './career-parts';

/** Section 1: what the job is for, how it is measured, and what it is responsible for. */
export function DescriptionSection({ content }: { content: CareerContent }) {
  const { t } = useTranslation('career-profile');
  const tasks = content.responsibilities.reduce((sum, g) => sum + g.tasks.length, 0);
  return (
    <div className="flex flex-col gap-4">
      <Part title={t('description.summary')}>
        <p className="text-fg">{content.summary}</p>
      </Part>
      <Part title={t('description.kpis')}>
        <Indicators kpis={content.kpis} />
      </Part>
      <Part title={t('description.responsibilities', { groups: content.responsibilities.length, tasks })}>
        <Responsibilities groups={content.responsibilities} />
      </Part>
    </div>
  );
}
