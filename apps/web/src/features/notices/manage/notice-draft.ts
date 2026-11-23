import { NOTICE_LIMITS, type CreateNoticeInput, type FileDto, type NoticeAudienceRuleDto, type NoticeAudienceRule, type NoticeChannelCode, type NoticeDetailsDto, type NoticeType } from '@arweqah-platform/shared';

export type FormMode = 'new' | 'edit' | 'revise';

/** What the writer has typed so far (the audience is kept as the three picks it is made of). */
export interface Draft {
  channelCode: NoticeChannelCode | '';
  publishOn: string;
  kind: NoticeType | '';
  titleAr: string;
  titleEn: string;
  body: string;
  everyone: boolean;
  unitIds: string[];
  includeBelow: boolean;
  titleIds: string[];
  groupIds: string[];
  files: FileDto[];
}

/** Today in Riyadh, `YYYY-MM-DD`: the earliest day a notice may be published. */
export const riyadhToday = (): string => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });

export const emptyDraft = (channelCode: NoticeChannelCode | ''): Draft => ({
  channelCode,
  publishOn: riyadhToday(),
  kind: '',
  titleAr: '',
  titleEn: '',
  body: '',
  everyone: true,
  unitIds: [],
  includeBelow: true,
  titleIds: [],
  groupIds: [],
  files: [],
});

const idsOf = (rules: NoticeAudienceRuleDto[], type: NoticeAudienceRuleDto['type']) => rules.filter((r) => r.type === type && r.refId).map((r) => r.refId as string);

export function draftOf(notice: NoticeDetailsDto): Draft {
  const rules = notice.audienceRules;
  const units = rules.filter((r) => r.type === 'unit');
  return {
    channelCode: notice.channel.code,
    publishOn: notice.publishOn ?? riyadhToday(),
    kind: notice.kind,
    titleAr: notice.titleAr,
    titleEn: notice.titleEn ?? '',
    body: notice.body,
    everyone: rules.length === 0 || rules.some((r) => r.type === 'all'),
    unitIds: idsOf(rules, 'unit'),
    includeBelow: units.length === 0 || units.every((r) => r.includeBelow),
    titleIds: idsOf(rules, 'title'),
    groupIds: idsOf(rules, 'people_group'),
    files: notice.files,
  };
}

export function audienceOf(d: Draft): NoticeAudienceRule[] {
  if (d.everyone) return [{ type: 'all' }];
  return [
    ...d.unitIds.map((refId): NoticeAudienceRule => ({ type: 'unit', refId, includeBelow: d.includeBelow })),
    ...d.titleIds.map((refId): NoticeAudienceRule => ({ type: 'title', refId })),
    ...d.groupIds.map((refId): NoticeAudienceRule => ({ type: 'people_group', refId })),
  ];
}

export const audiencePicked = (d: Draft): boolean => d.everyone || d.unitIds.length + d.titleIds.length + d.groupIds.length > 0;

/** The body of the create / update call (`publishOn` is left out of a new version: it is published as soon as it is approved). */
export function inputOf(d: Draft, mode: FormMode): CreateNoticeInput {
  return {
    channelCode: d.channelCode as NoticeChannelCode,
    kind: d.kind as NoticeType,
    titleAr: d.titleAr.trim(),
    titleEn: d.titleEn.trim() || null,
    body: d.body.trim(),
    audience: audienceOf(d),
    fileIds: d.files.map((f) => f.id),
    publishOn: mode === 'revise' ? riyadhToday() : d.publishOn,
  };
}

/** Why the notice cannot be sent for approval yet (null when it can). */
export function missingOf(d: Draft, mode: FormMode): 'channel' | 'date' | 'kind' | 'title' | 'body' | 'audience' | null {
  if (!d.channelCode) return 'channel';
  if (mode !== 'revise' && (!d.publishOn || d.publishOn < riyadhToday())) return 'date';
  if (!d.kind) return 'kind';
  if (!d.titleAr.trim() || d.titleAr.length > NOTICE_LIMITS.titleMax) return 'title';
  if (!d.body.trim()) return 'body';
  return audiencePicked(d) ? null : 'audience';
}
