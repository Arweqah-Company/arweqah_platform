import type { BrandColor, TemplateContent, TemplateDto, TemplateKind, TemplateLang } from '@arweqah-platform/shared';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { Alert, Dialog, FormField, Input, Tabs } from '@/shared/ui';
import { TemplateButtons } from './template-buttons';
import { ColorField } from './color-field';
import { KIND_KEYS } from './keys';
import { TemplateEditor } from './template-editor';
import { TemplatePreview } from './template-preview';
import type { VariableItem } from './variable-suggestion';

const LANGS: TemplateLang[] = ['ar', 'en'];
const DEFAULT_COLORS = { band: 'petrol', button: 'petrol' } as const;

function Variables({ template, lang }: { template: TemplateDto; lang: TemplateLang }) {
  const { t } = useTranslation('templates');
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-bold">{t('variables.title')}</h3>
      <p className="text-sm text-muted">{t('variables.hint')}</p>
      <dl className="grid gap-2 sm:grid-cols-2">
        {template.variables.map((v) => (
          <div key={v.name} className="rounded-xl bg-neutral-50 p-3 text-sm">
            <dt className="font-medium text-link">@{lang === 'ar' ? v.descriptionAr : v.descriptionEn}{v.required && <span className="text-muted"> ({t('variables.required')})</span>}</dt>
            <dd className="text-muted">{t('variables.example')}: <span dir="auto">{lang === 'ar' ? v.exampleAr : v.exampleEn}</span></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Wording({ template, kind, lang, content, onChange, readOnly }: { template: TemplateDto; kind: TemplateKind; lang: TemplateLang; content: TemplateContent; onChange: Dispatch<SetStateAction<TemplateContent>>; readOnly: boolean }) {
  const { t } = useTranslation('templates');
  const part = content[lang];
  const items: VariableItem[] = template.variables.map((v) => ({ id: v.name, label: lang === 'ar' ? v.descriptionAr : v.descriptionEn }));
  /** A functional update: an editor keeps the callback it was created with, so it must never rely on the content of that moment. */
  const set = (patch: Partial<typeof part>) => onChange((prev) => ({ ...prev, [lang]: { ...prev[lang], ...patch } }));
  return (
    <div className="flex flex-col gap-4">
      <FormField label={`${kind === 'email' ? t('fields.subject') : t('fields.title')} *`}>{() => <TemplateEditor key={`title-${lang}`} mode="line" lang={lang} variables={items} value={part.title} onChange={(title) => set({ title })} label={kind === 'email' ? t('fields.subject') : t('fields.title')} readOnly={readOnly} />}</FormField>
      {kind === 'email' && <FormField label={t('fields.preheader')} hint={t('fields.preheaderHint')}>{(p) => <Input {...p} dir={lang === 'ar' ? 'rtl' : 'ltr'} value={part.preheader} maxLength={200} onChange={(e) => set({ preheader: e.target.value })} />}</FormField>}
      <FormField label={`${t('fields.body')} *`}>{() => <TemplateEditor key={`body-${lang}`} mode={kind === 'email' ? 'rich' : 'plain'} lang={lang} variables={items} value={part.body} onChange={(body) => set({ body })} label={t('fields.body')} readOnly={readOnly} />}</FormField>
      {kind === 'email' && <FormField label={t('fields.button')} hint={t('fields.buttonHint')}>{(p) => <Input {...p} dir={lang === 'ar' ? 'rtl' : 'ltr'} value={part.buttonText} maxLength={60} onChange={(e) => set({ buttonText: e.target.value })} />}</FormField>}
    </div>
  );
}

const lang0 = (language: string): TemplateLang => (language === 'ar' ? 'ar' : 'en');

function ColorFields({ content, setContent }: { content: TemplateContent; setContent: Dispatch<SetStateAction<TemplateContent>> }) {
  const { t } = useTranslation('templates');
  const colors = content.colors ?? DEFAULT_COLORS;
  const pick = (part: 'band' | 'button') => (color: BrandColor) => setContent((prev) => ({ ...prev, colors: { ...(prev.colors ?? DEFAULT_COLORS), [part]: color } }));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ColorField label={t('fields.band')} value={colors.band as BrandColor} onChange={pick('band')} />
      <ColorField label={t('fields.buttonColor')} value={colors.button as BrandColor} onChange={pick('button')} />
    </div>
  );
}

/** The wording of one message in both languages: edit, see it filled with examples, try it by e-mail, save it (or send it for approval), reset it. */
export function TemplateDialog({ kind, template, requireApproval, onClose }: { kind: TemplateKind; template: TemplateDto; requireApproval: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation('templates');
  const [content, setContent] = useState<TemplateContent>(template.pending?.content ?? template.content);
  const [lang, setLang] = useState<TemplateLang>(lang0(i18n.language));
  const readOnly = !usePermissions().can(KIND_KEYS[kind].edit);
  return (
    <Dialog open wide onOpenChange={(open) => !open && onClose()} title={i18n.language === 'ar' ? template.nameAr : template.nameEn} description={i18n.language === 'ar' ? template.descriptionAr : template.descriptionEn}>
      <div className="flex flex-col gap-5">
        {template.pending && <Alert tone="warning">{t('pending.banner', { name: template.pending.submittedByName })}</Alert>}
        <Tabs tabs={LANGS.map((id) => ({ id, label: t(`lang.${id}`) }))} value={lang} label={t('lang.label')} onChange={setLang} />
        <fieldset disabled={readOnly} className="flex flex-col gap-5 border-0 p-0">
          <Wording template={template} kind={kind} lang={lang} content={content} onChange={setContent} readOnly={readOnly} />
          {kind === 'email' && <ColorFields content={content} setContent={setContent} />}
        </fieldset>
        <Variables template={template} lang={lang} />
        <TemplatePreview kind={kind} templateKey={template.key} content={content} lang={lang} />
        <TemplateButtons kind={kind} template={template} content={content} lang={lang} requireApproval={requireApproval} readOnly={readOnly} onClose={onClose} />
      </div>
    </Dialog>
  );
}
