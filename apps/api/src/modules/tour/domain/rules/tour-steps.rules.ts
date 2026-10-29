import { TOUR_STEPS, type TourId, type TourStepDef } from '@arweqah-platform/shared';

const STEP = 10;

/** The order a step has when nobody reordered it: its place in the code, so a step added later lands where the code puts it. */
export function defaultOrder(tour: TourId, key: string): number {
  return (TOUR_STEPS.filter((s) => s.tour === tour).findIndex((s) => s.key === key) + 1) * STEP;
}

/** The steps of one tour sorted by the administrator's order, falling back to the code's order; ties keep the code's order. */
export function sortedSteps(tour: TourId, saved: ReadonlyMap<string, number | null>): TourStepDef[] {
  const own = TOUR_STEPS.filter((s) => s.tour === tour);
  const order = (s: TourStepDef): number => saved.get(s.key) ?? defaultOrder(tour, s.key);
  return [...own].sort((a, b) => order(a) - order(b) || defaultOrder(tour, a.key) - defaultOrder(tour, b.key));
}

/** The order is valid when it holds every step of the tour once and nothing else. */
export function isCompleteOrder(tour: TourId, keys: readonly string[]): boolean {
  const own = TOUR_STEPS.filter((s) => s.tour === tour).map((s) => s.key as string);
  return keys.length === own.length && new Set(keys).size === own.length && keys.every((k) => own.includes(k));
}

/** Position `n` (0-based) becomes the stored number, with gaps so a step added later can sit between two. */
export function storedOrder(position: number): number {
  return (position + 1) * STEP;
}
