import { useState } from 'react';
import { useIsPhone } from './use-is-phone';

export type ViewMode = 'table' | 'cards';

const read = (key: string): ViewMode | null => {
  try {
    const value = window.localStorage.getItem(`view:${key}`);
    return value === 'table' || value === 'cards' ? value : null;
  } catch {
    return null;
  }
};

/** Table or cards for one list; the choice is remembered per list in this browser. Phones start with cards. */
export function useViewMode(key: string): [ViewMode, (mode: ViewMode) => void] {
  const phone = useIsPhone();
  const [chosen, setChosen] = useState<ViewMode | null>(() => read(key));
  const set = (mode: ViewMode) => {
    setChosen(mode);
    try {
      window.localStorage.setItem(`view:${key}`, mode);
    } catch {
      // The preference simply is not remembered.
    }
  };
  return [chosen ?? (phone ? 'cards' : 'table'), set];
}
