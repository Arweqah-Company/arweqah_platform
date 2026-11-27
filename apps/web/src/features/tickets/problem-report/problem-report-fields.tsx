import { MAX_PROBLEM_NOTE, type ProblemReportAnalysisDto } from '@arweqah-platform/shared';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, FormField, Input, Textarea } from '@/shared/ui';

interface Props {
  title: string;
  note: string;
  onTitle: (title: string) => void;
  onNote: (note: string) => void;
  /** The «Analyse with the AI» button shows (the analysis is on and an AI service is on). */
  canAnalyze: boolean;
  analyzing: boolean;
  onAnalyze: () => void;
  /** What the AI wrote last (the notice under the fields), null before it was asked. */
  read: ProblemReportAnalysisDto | null;
  /** The screenshot goes to the AI too (kept, and the administrator allowed it). */
  seesPicture: boolean;
}

/** The title and the description of the report, which the AI can write and the person always may change. */
export function ProblemReportFields({ title, note, onTitle, onNote, canAnalyze, analyzing, onAnalyze, read, seesPicture }: Props) {
  const { t } = useTranslation('tickets');
  return (
    <div className="flex flex-col gap-4">
      <FormField label={t('problemReport.reportTitle')} hint={t('problemReport.reportTitleHint')}>
        {(p) => <Input {...p} maxLength={200} disabled={analyzing} value={title} onChange={(e) => onTitle(e.target.value)} />}
      </FormField>
      <FormField label={t('problemReport.note')} hint={t('problemReport.noteHint')}>
        {(p) => <Textarea {...p} rows={5} maxLength={MAX_PROBLEM_NOTE} disabled={analyzing} value={note} onChange={(e) => onNote(e.target.value)} />}
      </FormField>
      {canAnalyze && (
        <div className="flex flex-col items-start gap-2">
          <Button variant="secondary" size="sm" disabled={analyzing} onClick={onAnalyze}>
            <Sparkles className="size-4" aria-hidden />
            {analyzing ? t('problemReport.analyzing') : t('problemReport.analyze')}
          </Button>
          <p className="text-sm text-muted">{seesPicture ? t('problemReport.analyzeSeesPicture') : t('problemReport.analyzeTextOnly')}</p>
        </div>
      )}
      {read && <Alert tone="info">{t('problemReport.analyzedNote')}{!read.imageSeen && ` ${t('problemReport.analyzedTextOnly')}`}</Alert>}
    </div>
  );
}
