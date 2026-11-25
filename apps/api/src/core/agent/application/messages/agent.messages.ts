import type { StoredDraft } from '../../domain/entities/agent.entities';

export const AGENT_AUDIT = {
  executed: 'agent.action_executed',
  failed: 'agent.action_failed',
} as const;

export type AgentLocale = 'ar' | 'en';

/** The language of the person: the web sends its own with `X-UI-Language` (the browser's `Accept-Language` is only the fallback); Arabic is the platform's default. */
export function localeOf(language: string | string[] | undefined): AgentLocale {
  const first = Array.isArray(language) ? language[0] : language;
  return first?.trim().toLowerCase().startsWith('en') ? 'en' : 'ar';
}

const TEXTS = {
  pictureTitle: { ar: 'صورة', en: 'Picture' },
  gaveUp: { ar: 'لم أستطع إكمال الطلب. حاول صياغته بشكل أبسط.', en: 'I could not finish that. Try putting it more simply.' },
} as const;

export const agentText = (key: keyof typeof TEXTS, locale: AgentLocale): string => TEXTS[key][locale];

/** What the employee reads after a confirmed request ran. */
export function outcomeText(draft: StoredDraft, ok: boolean, detail: string, locale: AgentLocale): string {
  const label = locale === 'ar' ? draft.labelAr : draft.labelEn;
  if (ok) return locale === 'ar' ? `تم: ${label}.` : `Done: ${label}.`;
  return locale === 'ar' ? `لم يتم تنفيذ «${label}»: ${detail}` : `"${label}" was not done: ${detail}`;
}
