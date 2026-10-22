import { useState } from 'react';
import { useIsPhone } from './use-is-phone';

export type ViewMode = 'table' | 'cards';

interface ViewOptions<M extends string> {
  /** The views this list offers; the first is the default on a computer. */
  modes: readonly M[];
  /** What a phone starts with when the person has not chosen yet. */
  phoneDefault: M;
}

const TABLE_OR_CARDS: ViewOptions<ViewMode> = { modes: ['table', 'cards'], phoneDefault: 'cards' };

const read = <M extends string>(key: string, modes: readonly M[]): M | null => {
  try {
    const value = window.localStorage.getItem(`view:${key}`) as M | null;
    return value && modes.includes(value) ? value : null;
  } catch {
    return null;
  }
};

/** The chosen view of one list (table / cards by default); remembered per list in this browser. */
export function useViewMode<M extends string = ViewMode>(key: string, options: ViewOptions<M> = TABLE_OR_CARDS as unknown as ViewOptions<M>): [M, (mode: M) => void] {
  const phone = useIsPhone();
  const [chosen, setChosen] = useState<M | null>(() => read(key, options.modes));
  const set = (mode: M) => {
    setChosen(mode);
    try {
      window.localStorage.setItem(`view:${key}`, mode);
    } catch {
      // The preference simply is not remembered.
    }
  };
  return [chosen ?? (phone ? options.phoneDefault : (options.modes[0] as M)), set];
}
