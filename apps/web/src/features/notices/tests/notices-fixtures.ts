import type { NoticeAbilitiesDto, NoticeListItemDto, NoticeMineDetailsDto } from '@arweqah-platform/shared';

export const noAbilities: NoticeAbilitiesDto = { edit: false, submit: false, delete: false, pin: false, unpin: false, archive: false, revise: false, reviseCancel: false, approve: false, reject: false };

const channel = { code: 'hr' as const, nameAr: 'HR-ar', nameEn: 'Human resources' };

export const listItem = (id: string, over: Partial<NoticeListItemDto> = {}): NoticeListItemDto => ({
  id,
  channel,
  kind: 'policy',
  status: 'draft',
  version: 1,
  titleAr: `Notice ${id}`,
  titleEn: null,
  author: { id: 'u1', name: 'Sara Ahmed' },
  authorUnit: { id: 'n1', nameAr: 'Unit-ar', nameEn: 'HR' },
  publishOn: '2026-12-01',
  publishedAt: null,
  submittedAt: null,
  createdAt: '2026-11-20T08:00:00.000Z',
  isPinned: false,
  hiddenForRevision: false,
  audience: { all: true, rules: 1, recipients: 120 },
  ack: null,
  abilities: noAbilities,
  ...over,
});

export const mineItem = (over: Partial<NoticeMineDetailsDto> = {}): NoticeMineDetailsDto => ({
  id: 'm1',
  channel,
  kind: 'policy',
  titleAr: 'Travel policy',
  titleEn: null,
  excerpt: 'Excerpt',
  publishedAt: '2026-11-01T00:00:00.000Z',
  isPinned: false,
  isArchived: false,
  version: 1,
  myState: 'await',
  readAt: null,
  acknowledgedAt: null,
  acknowledgedOlderVersion: false,
  body: '<p>Policy text</p>',
  files: [],
  ...over,
});
