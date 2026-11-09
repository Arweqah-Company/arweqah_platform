import type { LearningRecordDto, RecordStatus } from '@arweqah-platform/shared';

/** The state of a unit for the employee: no record is «not started». */
export type UnitState = 'todo' | RecordStatus;

export const UNIT_STATES: readonly UnitState[] = ['todo', 'wait', 'referred', 'done', 'rej'];
export const stateOf = (record: LearningRecordDto | undefined): UnitState => record?.status ?? 'todo';

export const STATE_TONE: Record<UnitState, 'neutral' | 'warning' | 'info' | 'success' | 'danger'> = { todo: 'neutral', wait: 'warning', referred: 'info', done: 'success', rej: 'danger' };

/** The records of the employee by unit id. */
export const byUnit = (records: readonly LearningRecordDto[] | undefined): Map<string, LearningRecordDto> => new Map((records ?? []).map((r) => [r.unitId, r]));
