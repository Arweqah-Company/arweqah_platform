import type { CareerContent, DevelopmentStageDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { EvaluationSection } from '@/features/performance';
import { Alert } from '@/shared/ui';
import { DescriptionSection } from './description-section';
import { DevelopmentSection } from './development-section';
import { LearningSection } from './learning-section';
import { RequiredSection } from './required-section';
import type { CareerSectionKey } from './sections';

/** In a preview of a title (HR) nobody is evaluated: the section only says what it is. */
function EvaluationNote() {
  const { t } = useTranslation('career-profile');
  return <Alert tone="info">{t('evaluation.note')}</Alert>;
}

/** The body of one of the five sections. */
export function SectionBody({ section, content, stage, preview }: { section: CareerSectionKey; content: CareerContent; stage?: DevelopmentStageDto | null; preview?: boolean }) {
  switch (section) {
    case 'description': return <DescriptionSection content={content} />;
    case 'evaluation': return preview ? <EvaluationNote /> : <EvaluationSection />;
    case 'development': return <DevelopmentSection content={content} stage={stage} preview={preview} />;
    case 'learning': return <LearningSection content={content} preview={preview} />;
    case 'required': return <RequiredSection content={content} preview={preview} />;
  }
}
