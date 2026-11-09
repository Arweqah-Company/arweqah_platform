import type { CareerContent, CareerContentStatus, DevelopmentStageDto, ProofKind, RecordStatus, TitleTrack } from '@arweqah-platform/shared';

/** The stored content of one title: null content = nothing saved yet. */
export interface StoredCareerContent {
  titleId: string;
  version: number;
  status: CareerContentStatus;
  content: CareerContent;
  updatedAt: Date;
}

/** Who a title is, for the modules that hang content on it. */
export interface TitleIdentity {
  id: string;
  code: string | null;
  nameAr: string;
  nameEn: string;
  grade: number | null;
  track: TitleTrack | null;
  unit: { code: string | null; nameAr: string; nameEn: string };
  /** The development stage of the grade and track, or null when no rule covers them. */
  stage: DevelopmentStageDto | null;
}

/** One write of a title's content at `version` (the previous version + 1). */
export interface ContentWrite {
  titleId: string;
  content: CareerContent;
  status: CareerContentStatus;
  version: number;
  actorId: string;
}

/** A learning record as the services read it (with the name of the proof file when there is one). */
export interface LearningRecordRow {
  id: string;
  employeeId: string;
  titleId: string;
  unitId: string;
  status: RecordStatus;
  proofKind: ProofKind;
  fileId: string | null;
  fileName: string | null;
  note: string | null;
  minutes: number;
  submittedAt: Date;
  decidedBy: string | null;
  decidedAt: Date | null;
  rejectionReason: string | null;
  rejectionCount: number;
}

/** A row of the review queue: the record with the employee and the unit of their title. */
export interface QueueRow extends LearningRecordRow {
  employeeName: string;
  unitNameAr: string | null;
  unitNameEn: string | null;
}

/** What sending a proof writes (a new record, or the replacement of a rejected one). */
export interface RecordWrite {
  employeeId: string;
  titleId: string;
  unitId: string;
  status: 'wait' | 'referred';
  proofKind: ProofKind;
  fileId: string | null;
  note: string | null;
  minutes: number;
  submittedAt: Date;
}

/** What a decision writes. */
export interface RecordDecision {
  status: 'done' | 'rej' | 'referred';
  decidedBy: string;
  decidedAt: Date;
  rejectionReason: string | null;
  /** Added to the count of rejections (1 for a rejection, else 0). */
  rejectionIncrement: number;
}

/** A tick (or an untick) of one item of «required». */
export interface RequiredTick {
  employeeId: string;
  titleId: string;
  index: number;
  done: boolean;
  at: Date;
}
