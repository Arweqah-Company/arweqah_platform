import type { CareerContent } from './content';

type Ladder = CareerContent['ladder'];

/**
 * The career ladder in the order it is climbed: the level with the biggest number is the entry (L9) and L1 is the top, so the first step is the
 * lowest rank and each next one is higher, whatever order the file or the editor listed them in. The sort is stable.
 */
export function orderedLadder(ladder: Ladder): Ladder {
  return [...ladder].sort((a, b) => Number(b.level.slice(1)) - Number(a.level.slice(1)));
}
