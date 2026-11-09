import type { TourId } from '@arweqah-platform/shared';
import { useEffect, useReducer, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { PAGE_MAIN_TARGET, type TourStepUi } from '@/core/feature';
import type { PlayStep } from './play-steps';
import { isPhoneLayout, waitForPath, waitForTarget } from './tour-wait';

/** Once the page is there its element is there too: if it is not within this time, this person has no such element and the step is left out. */
const TARGET_WAIT_MS = 1_800;

export interface Run {
  tour: TourId;
  steps: PlayStep[];
  index: number;
  /** The indexes of the steps whose element never appeared on this person's screen: they are not counted in «3 of 20». */
  skipped: number[];
}

/** Where the person is among the steps they will really see: a step skipped because its element is not on their screen is in neither number. */
export function positionOf(run: Run | null | undefined): { index: number; total: number } {
  if (!run) return { index: 0, total: 0 };
  return { index: run.index - run.skipped.filter((i) => i < run.index).length, total: run.steps.length - run.skipped.length };
}

type Ending = { tour: TourId; how: 'completed' | 'skipped' };
interface State {
  run: Run | null;
  /** The element is on screen: the step may be drawn. */
  ready: boolean;
  /** The selector of the element that showed (the step's own, or its fallback). */
  target: string | null;
  /** Which way the person is going, so a step that cannot be shown is skipped in that direction. */
  direction: 1 | -1;
  ended: Ending | null;
}
type Action = { type: 'start'; run: Run } | { type: 'move'; by: 1 | -1 } | { type: 'missing' } | { type: 'ready'; target: string } | { type: 'end'; how: Ending['how'] };

const IDLE: State = { run: null, ready: false, target: null, direction: 1, ended: null };

function reduce(state: State, action: Action): State {
  const { run } = state;
  if (action.type === 'start') return { run: action.run, ready: false, target: null, direction: 1, ended: null };
  if (!run) return state;
  if (action.type === 'ready') return { ...state, ready: true, target: action.target };
  if (action.type === 'end') return { ...IDLE, ended: { tour: run.tour, how: action.how } };
  const by = action.type === 'missing' ? state.direction : action.by;
  const skipped = action.type === 'missing' && !run.skipped.includes(run.index) ? [...run.skipped, run.index] : run.skipped;
  const index = run.index + by;
  if (index >= run.steps.length) return { ...IDLE, ended: { tour: run.tour, how: 'completed' } };
  return { ...state, run: { ...run, index: Math.max(index, 0), skipped }, ready: false, target: null, direction: by, ended: null };
}

interface Hooks {
  setDrawer: (open: boolean) => void;
  setAccountMenu: (open: boolean) => void;
  setNav: (route: string | null) => void;
  onEnd: (tour: TourId, how: Ending['how']) => void;
}

/** What a step may point at, best first: a page's «main thing» falls back to the page's whole content area, so a view with no list (a board, an empty state) still gets its page step. */
export const targetsOf = (ui: TourStepUi): string[] => (ui.target === PAGE_MAIN_TARGET ? [ui.target, '#main'] : [ui.target]);

/** Opens what a step points into (its page, the account menu, the phone's drawer) and waits for the element; the selector that showed, or null if none ever does. */
async function prepare(ui: TourStepUi, hooks: Pick<Hooks, 'setDrawer' | 'setAccountMenu' | 'setNav'>, goTo: (route: string) => void): Promise<string | null> {
  hooks.setAccountMenu(ui.menu === 'account');
  hooks.setNav(ui.navOpen ?? null);
  hooks.setDrawer(ui.menu === 'drawer' && isPhoneLayout());
  if (ui.route) {
    goTo(ui.route);
    if (!(await waitForPath(ui.route, TARGET_WAIT_MS))) return null;
  }
  for (const target of targetsOf(ui)) if (await waitForTarget(target, TARGET_WAIT_MS)) return target;
  return null;
}

/** Steps through a tour one step at a time; a step whose element never appears is skipped in the direction the person is going. */
export function useTourRunner(hooks: Hooks) {
  const { setDrawer, setAccountMenu, setNav, onEnd } = hooks;
  const navigate = useNavigate();
  const location = useLocation();
  const here = useRef('');
  useEffect(() => { here.current = `${location.pathname}${location.search}`; });
  const [state, dispatch] = useReducer(reduce, IDLE);
  const { run, ended } = state;
  const current = run?.steps[run.index];

  useEffect(() => {
    if (!current) return undefined;
    let cancelled = false;
    void prepare(current.ui, { setDrawer, setAccountMenu, setNav }, (route) => route !== here.current && navigate(route)).then((found) => {
      if (!cancelled) dispatch(found ? { type: 'ready', target: found } : { type: 'missing' });
    });
    return () => { cancelled = true; };
  }, [run?.tour, run?.index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ended) return;
    setAccountMenu(false);
    setNav(null);
    setDrawer(false);
    onEnd(ended.tour, ended.how);
  }, [ended]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    run, ready: state.ready, current: current && run ? { ...run.steps[run.index]!, ui: { ...current.ui, target: state.target ?? current.ui.target } } : undefined,
    start: (tour: TourId, steps: PlayStep[]) => { if (steps.length) dispatch({ type: 'start', run: { tour, steps, index: 0, skipped: [] } }); },
    next: () => dispatch({ type: 'move', by: 1 }), back: () => dispatch({ type: 'move', by: -1 }), skip: () => dispatch({ type: 'end', how: 'skipped' }),
  };
}
