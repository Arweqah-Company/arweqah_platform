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
  /** The sidebar link's label for a route, when the page has one. */
  navLabel: (route: string) => string | undefined;
}

/** Before a page's own step, the sidebar link that opens it is shown first (once per page, however many steps the page has). */
function navStep(step: PlayStep, shown: Set<string>, { navLabel, t }: PlayOptions): PlayStep[] {
  const route = step.ui.route?.split(/[?#]/)[0];
  const label = route ? navLabel(route) : undefined;
  // The home page is where the tour already is, and a step inside a menu has no sidebar link of its own.
  if (!route || route === '/' || !label || step.ui.menu || shown.has(route)) return [];
  shown.add(route);
  const ui: TourStepUi = { key: `${step.key}:nav`, target: `[data-tour="nav:${route}"]`, placement: 'end', menu: 'drawer', navOpen: route };
  return [{ key: ui.key, ui, title: label, body: t('navHint', { ns: 'tour', page: label }), can: [] }];
}

/** The steps to play from what the API sent: all of them, or only the new ones; a step no feature points anywhere is left out. */
export function playSteps(dto: TourDto, owners: ReadonlyMap<string, OwnedStep>, options: PlayOptions): PlayStep[] {
  const fresh = new Set<string>(dto.newSteps);
  const shown = new Set<string>();
  return dto.steps.flatMap((s) => {
    const owned = owners.get(s.key);
    if (!owned || (options.onlyNew && !fresh.has(s.key))) return [];
    const step = toPlayStep(s, owned, options.lang, options);
    return [...navStep(step, shown, options), step];
  });
}
