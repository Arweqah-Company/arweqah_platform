import { CATALOG_CAPS_DEFAULT, type StageTemplate } from '@arweqah-platform/shared';

/**
 * The caps of the two kinds of the extra component (internal initiatives, contribution to growth), read from the first stage template that is kept:
 * its extra components are learning, initiatives and growth in that order, and the points of each is its cap. A template without them gives the defaults.
 */
export function catalogCaps(stages: readonly StageTemplate[]): { init: number; growth: number } {
  const first = [...stages].sort((a, b) => a.stage - b.stage)[0];
  return { init: first?.extra[1]?.points ?? CATALOG_CAPS_DEFAULT.init, growth: first?.extra[2]?.points ?? CATALOG_CAPS_DEFAULT.growth };
}
