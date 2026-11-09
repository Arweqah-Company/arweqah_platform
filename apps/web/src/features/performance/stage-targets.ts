import type { CycleStage } from '@arweqah-platform/shared';

/**
 * Where «go to this stage's screen» leads HR from a stage: `here` is the cycle page itself (the self-evaluation and the manager's stage are followed from here),
 * a path is the screen of the stage, and `null` is a screen that is not built yet (calibration and approval come in delivery 5b; their path goes here then).
 */
export type StageTarget = 'here' | `/${string}` | null;

export const STAGE_TARGETS: Record<CycleStage, StageTarget> = { self: 'here', mgr: 'here', cal: null, appr: null, notif: null, obj: null, closed: null };
