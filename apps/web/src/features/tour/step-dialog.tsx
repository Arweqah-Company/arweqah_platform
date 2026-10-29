import { TOUR_BODY_MAX, TOUR_TITLE_MAX, type TourStepSettingDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Button, Dialog, FormField, Input, Textarea } from '@/shared/ui';
import { useEditStep } from './settings.api';
import { useTourControls } from './tour-context';
import { TOUR_KEYS } from './keys';

type Lang = 'ar' | 'en';
const LANGS: Lang[] = ['ar', 'en'];
const pick = (step: TourStepSettingDto, lang: Lang) => ({ title: (lang === 'ar' ? step.titleAr : step.titleEn) ?? '', body: (lang === 'ar' ? step.bodyAr : step.bodyEn) ?? '' });

interface Draft {
  enabled: boolean;
  text: Record<Lang, { title: string; body: string }>;
}

/** One step's wording in one language; empty means «the code's wording», shown as the placeholder. */
function LanguageFields({ lang, value, fallback, onChange, readOnly }: { lang: Lang; value: Draft['text'][Lang]; fallback: Draft['text'][Lang] | null; onChange: (next: Draft['text'][Lang]) => void; readOnly: boolean }) {
  const { t } = useTranslation('tour');
  return (
    <fieldset className="grid gap-3 rounded-2xl border border-neutral-200 p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <legend className="px-2 text-sm font-bold">{t(`settings.languages.${lang}`)}</legend>
      <FormField label={t('settings.fields.title')} hint={t('settings.fields.emptyHint')}>
        {(p) => <Input {...p} placeholder={fallback?.title} maxLength={TOUR_TITLE_MAX} readOnly={readOnly} value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />}
      </FormField>
      <FormField label={t('settings.fields.body')}>
        {(p) => <Textarea {...p} rows={4} placeholder={fallback?.body} maxLength={TOUR_BODY_MAX} readOnly={readOnly} value={value.body} onChange={(e) => onChange({ ...value, body: e.target.value })} />}
      </FormField>
    </fieldset>
  );
}

/** Edit a step: its wording in both languages, and whether it is shown. */
export function StepDialog({ step, heading, onClose }: { step: TourStepSettingDto; heading: string; onClose: () => void }) {
  const { t } = useTranslation('tour');
  const { t: tc } = useTranslation();
  const { can } = usePermissions();
  const { defaultText } = useTourControls();
  const edit = useEditStep();
  const mayEdit = can(TOUR_KEYS.edit);
  const [draft, setDraft] = useState<Draft>({ enabled: step.enabled, text: { ar: pick(step, 'ar'), en: pick(step, 'en') } });
  const save = async () => {
    const { ar, en } = draft.text;
    try {
      await edit.mutateAsync({ key: step.key, enabled: draft.enabled, titleAr: ar.title, titleEn: en.title, bodyAr: ar.body, bodyEn: en.body });
      toast.success(t('settings.saved'));
      onClose();
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={heading} description={t('settings.dialogHint')} wide>
      <div className="grid gap-4">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="size-4 accent-petrol-800" checked={draft.enabled} disabled={!mayEdit} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
          <span className="font-medium">{t('settings.shown')}</span>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          {LANGS.map((lang) => (
            <LanguageFields key={lang} lang={lang} fallback={defaultText(step.key, lang)} readOnly={!mayEdit} value={draft.text[lang]} onChange={(next) => setDraft({ ...draft, text: { ...draft.text, [lang]: next } })} />
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          {mayEdit && <Button onClick={() => void save()} disabled={edit.isPending}>{tc('actions.save')}</Button>}
        </div>
      </div>
    </Dialog>
  );
}
