/**
 * The bar «the evaluation cycle is open» (plan §15.2): one notice for each evaluation task asked of the signed-in person now.
 * Calibration and approval join the list when their screens exist.
 */
export const NOTICE_KINDS = ['self', 'team'] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];

export interface EvaluationNoticeDto {
  kind: NoticeKind;
  /** The date (range) of the task's stage on the cycle page; null when none is set. */
  due: { from: string; to: string | null } | null;
  /** The screen the person works from. */
  path: string;
}

export interface EvaluationNoticesDto {
  items: EvaluationNoticeDto[];
}
