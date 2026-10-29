import type { TourId } from '@arweqah-platform/shared';
import { useEffect, useReducer, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { TourStepUi } from '@/core/feature';
import type { PlayStep } from './play-steps';
import { isPhoneLayout, waitForPath, waitForTarget } from './tour-wait';

const TARGET_WAIT_MS = 3_000;

export interface Run {
  tour: TourId;
  steps: PlayStep[];
  index: number;
}

type Ending = { tour: TourId; how: 'completed' | 'skipped' };
interface State {
  run: Run | null;
  /** The element is on screen: the step may be drawn. */
  ready: boolean;
  /** Which way the person is going, so a step that cannot be shown is skipped in that direction. */
  direction: 1 | -1;
  ended: Ending | null;
}
type Action = { type: 'start'; run: Run } | { type: 'move'; by: 1 | -1 } | { type: 'ready' } | { type: 'end'; how: Ending['how'] };

const IDLE: State = { run: null, ready: false, direction: 1, ended: null };

function reduce(state: State, action: Action): State {
  const { run } = state;
  if (action.type === 'start') return { run: action.run, ready: false, direction: 1, ended: null };
  if (!run) return state;
  if (action.type === 'ready') return { ...state, ready: true };
  if (action.type === 'end') return { ...IDLE, ended: { tour: run.tour, how: action.how } };
  const index = run.index + action.by;
  if (index >= run.steps.length) return { ...IDLE, ended: { tour: run.tour, how: 'completed' } };
  return { ...state, run: { ...run, index: Math.max(index, 0) }, ready: false, direction: action.by, ended: null };
}

interface Hooks {
  setDrawer: (open: boolean) => void;
  setAccountMenu: (open: boolean) => void;
  setNav: (route: string | null) => void;
  onEnd: (tour: TourId, how: Ending['how']) => void;
}

/** Opens what a step points into (its page, the account menu, the phone's drawer) and waits for the element; false if it never shows. */
async function prepare(ui: TourStepUi, hooks: Pick<Hooks, 'setDrawer' | 'setAccountMenu' | 'setNav'>, goTo: (route: string) => void): Promise<boolean> {
  hooks.setAccountMenu(ui.menu === 'account');
  hooks.setNav(ui.navOpen ?? null);
  hooks.setDrawer(ui.menu === 'drawer' && isPhoneLayout());
  if (ui.route) {
    goTo(ui.route);
    if (!(await waitForPath(ui.route, TARGET_WAIT_MS))) return false;
  }
  return waitForTarget(ui.target, TARGET_WAIT_MS);
}

/** Steps through a tour one step at a time; a step whose element never appears is skipped in the direction the person is going. */
export function useTourRunner(hooks: Hooks) {
  const { setDrawer, setAccountMenu, setNav, onEnd } = hooks;
  const navigate = useNavigate();
  const location = useLocation();
  const here = useRef('');
  useEffect(() => { here.current = `${location.pathname}${location.search}`; });
  const [state, dispatch] = useReducer(reduce, IDLE);
  const { run, direction, ended } = state;
  const current = run?.steps[run.index];

  useEffect(() => {
    if (!current) return undefined;
    let cancelled = false;
    void prepare(current.ui, { setDrawer, setAccountMenu, setNav }, (route) => route !== here.current && navigate(route)).then((found) => {
      if (!cancelled) dispatch(found ? { type: 'ready' } : { type: 'move', by: direction });
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
    run, ready: state.ready, current: current && run ? run.steps[run.index] : undefined,
    start: (tour: TourId, steps: PlayStep[]) => { if (steps.length) dispatch({ type: 'start', run: { tour, steps, index: 0 } }); },
    next: () => dispatch({ type: 'move', by: 1 }), back: () => dispatch({ type: 'move', by: -1 }), skip: () => dispatch({ type: 'end', how: 'skipped' }),
  };
}
