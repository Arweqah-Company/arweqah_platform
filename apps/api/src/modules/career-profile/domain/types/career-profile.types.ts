import type { CareerContent, CareerContentStatus } from '@arweqah-platform/shared';

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
}

/** One write of a title's content at `version` (the previous version + 1). */
export interface ContentWrite {
  titleId: string;
  content: CareerContent;
  status: CareerContentStatus;
  version: number;
  actorId: string;
}
