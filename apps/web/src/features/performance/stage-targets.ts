import type { CycleStage } from '@arweqah-platform/shared';

/**
 * Where «go to this stage's screen» leads HR from a stage: `here` is the cycle page itself (the self-evaluation is followed from here; the manager's stage has «team evaluation»),
 * a path is the screen of the stage, and `null` is a screen that is not built yet (calibration, approval and the objections are on the calibration page).
 */
export type StageTarget = 'here' | `/${string}` | null;

export const STAGE_TARGETS: Record<CycleStage, StageTarget> = { self: 'here', mgr: '/performance-team', cal: '/performance-calibration', appr: '/performance-calibration', notif: '/performance-calibration', obj: '/performance-calibration', closed: null };
