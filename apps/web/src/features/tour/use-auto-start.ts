import type { TourDto, TourId } from '@arweqah-platform/shared';
import { useEffect, useRef, useState } from 'react';

const START_DELAY_MS = 900;
const TOURS: TourId[] = ['general', 'admin'];

interface Inputs {
  data: Record<TourId, TourDto | undefined>;
  running: boolean;
  begin: (tour: TourId, dto: TourDto, onlyNew: boolean) => void;
  /** Marks the new steps as seen without playing them. */
  dismiss: (tour: TourId) => void;
}

/**
 * Decides what to offer: a tour nobody has seen starts by itself (the administration tour only after the general one), and a tour
 * somebody finished earlier, that has steps they have not seen, is offered as «what's new». Each is offered once per visit.
 */
export function useAutoStart({ data, running, begin, dismiss }: Inputs) {
  const offered = useRef(new Set<TourId>());
  const [declined, setDeclined] = useState<TourId[]>([]);

  useEffect(() => {
    if (running) return undefined;
    const first = TOURS.find((t) => data[t]?.status === 'none' && data[t].steps.length > 0 && !offered.current.has(t));
    const blocked = first === 'admin' && data.general?.status === 'none' && data.general.steps.length > 0;
    if (!first || blocked) return undefined;
    const timer = setTimeout(() => {
      offered.current.add(first);
      begin(first, data[first]!, false);
    }, START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [data, running, begin]);

  const fresh = TOURS.find((t) => data[t]?.status !== 'none' && (data[t]?.newSteps.length ?? 0) > 0 && !declined.includes(t));
  return {
    whatsNew: running || !fresh ? null : { tour: fresh, count: data[fresh]!.newSteps.length },
    start: (tour: TourId) => begin(tour, data[tour]!, true),
    later: (tour: TourId) => {
      setDeclined((d) => [...d, tour]);
      dismiss(tour);
    },
  };
}
