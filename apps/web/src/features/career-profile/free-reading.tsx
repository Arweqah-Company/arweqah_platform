import type { CareerContent, DevelopmentStageDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs } from '@/shared/ui';
import { SectionBody } from './section-body';
import { CAREER_SECTION_KEYS, type CareerSectionKey } from './sections';

/** After the acknowledgement the five sections open in any order, as plain tabs. */
export function FreeReading({ content, stage, preview }: { content: CareerContent; stage?: DevelopmentStageDto | null; preview?: boolean }) {
  const { t } = useTranslation('career-profile');
  const [section, setSection] = useState<CareerSectionKey>('description');
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-4">
      <Tabs tabs={CAREER_SECTION_KEYS.map((id) => ({ id, label: t(`sections.${id}`) }))} value={section} label={t('page.sectionsLabel')} onChange={setSection} />
      <div role="tabpanel"><SectionBody section={section} content={content} stage={stage} preview={preview} /></div>
    </div>
  );
}
