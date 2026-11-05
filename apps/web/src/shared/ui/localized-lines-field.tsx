import type { LocalizedList } from '@arweqah-platform/shared';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { linesOf, listProblem, textOfLines } from '../lib/lines';
import { Textarea } from './form-field';

interface Props {
  label: string;
  hint?: string;
  value: LocalizedList;
  onChange: (next: LocalizedList) => void;
  /** The contract's limits: the most lines a language may have and the longest line. */
  maxItems: number;
  maxLength: number;
}

/** A list written in both languages: one box per language, one item per line (charter outputs, duties, qualifications, indicators). */
export function LocalizedLinesField({ label, hint, value, onChange, maxItems, maxLength }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const box = (lang: 'ar' | 'en') => {
    const problem = listProblem(value[lang], { maxItems, maxLength });
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-${lang}`} className="text-xs text-muted">{t(`language.${lang}`)}</label>
        <Textarea
          id={`${id}-${lang}`}
          rows={4}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          aria-label={`${label}: ${t(`language.${lang}`)}`}
          aria-invalid={!!problem}
          defaultValue={textOfLines(value[lang])}
          onChange={(e) => onChange({ ...value, [lang]: linesOf(e.target.value) })}
        />
        {problem && <p role="alert" className="text-xs text-danger-text">{t(`linesField.${problem}`, { max: problem === 'tooMany' ? maxItems : maxLength })}</p>}
      </div>
    );
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <div className="grid gap-3 sm:grid-cols-2">{box('ar')}{box('en')}</div>
    </fieldset>
  );
}
