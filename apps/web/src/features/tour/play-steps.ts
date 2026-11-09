import type { TourDto, TourStepDto } from '@arweqah-platform/shared';
import type { TFunction } from 'i18next';
import type { TourStepUi } from '@/core/feature';

/** A step the person will be shown: where it points and what it says (the administrator's wording, or the code's). */
export interface PlayStep {
  key: string;
  ui: TourStepUi;
  title: string;
  body: string;
  /** What this person can do on the page, from the permissions they hold. */
  can: string[];
}

export interface OwnedStep {
  ui: TourStepUi;
  /** The i18n namespace of the feature that owns the step (its texts are `tour.<key>.{title,body}`). */
  ns: string;
}

const pick = (ar: string | null, en: string | null, lang: string): string | null => (lang === 'ar' ? ar : en);

function toPlayStep(step: TourStepDto, owned: OwnedStep, lang: string, options: Pick<PlayOptions, 't' | 'allowed'>): PlayStep {
  const { t, allowed } = options;
  const title = pick(step.titleAr, step.titleEn, lang) ?? t(`tour.${step.key}.title`, { ns: owned.ns });
  const body = pick(step.bodyAr, step.bodyEn, lang) ?? t(`tour.${step.key}.body`, { ns: owned.ns });
  const can = (owned.ui.can ?? []).filter((c) => allowed(c.permission)).map((c) => t(`tour.${step.key}.can.${c.id}`, { ns: owned.ns }));
  return { key: step.key, ui: owned.ui, title, body, can };
}

interface PlayOptions {
  onlyNew: boolean;
  lang: string;
  t: TFunction;
  /** Does the person hold this permission? */
  allowed: (permission: string) => boolean;
}

/** The steps to play from what the API sent: all of them, or only the new ones; a step no feature points anywhere is left out. A page has no step of its own for its sidebar link: the app already shows the open page's link, and a second bubble with the same name was a repeat. */
export function playSteps(dto: TourDto, owners: ReadonlyMap<string, OwnedStep>, options: PlayOptions): PlayStep[] {
  const fresh = new Set<string>(dto.newSteps);
  return dto.steps.flatMap((s) => {
    const owned = owners.get(s.key);
    if (!owned || (options.onlyNew && !fresh.has(s.key))) return [];
    return [toPlayStep(s, owned, options.lang, options)];
  });
}
