import type { NoticeChannelDto } from '@arweqah-platform/shared';
import { http, HttpResponse } from 'msw';
import { me, server } from '../../../../test/msw';

/** A channel of a unit as the API answers it, with every ability off; a test turns on the ones it needs. */
export const channelOf = (code: string, over: Partial<NoticeChannelDto> = {}): NoticeChannelDto => ({
  id: `id-${code}`,
  code,
  nameAr: `Channel ${code} ar`,
  nameEn: `Channel ${code}`,
  unit: { id: 'u1', nameAr: 'Resources dept ar', nameEn: 'Resources dept' },
  isActive: true,
  writerRoleId: 'r1',
  writersCount: 0,
  noticesCount: 0,
  updatedAt: '2026-11-20T08:00:00.000Z',
  canAddWriter: false,
  canRemoveWriter: false,
  canRename: false,
  canToggle: false,
  canDelete: false,
  writers: [],
  ...over,
});

export const MANAGER = ['notices.channels_view', 'notices.channel_add', 'notices.channel_remove', 'notices.writer_add', 'notices.writer_remove', 'notices.channels_export'].map((key) => ({ key, scope: 'subtree' as const }));
export const hr = channelOf('hr', { nameAr: 'HR channel', nameEn: 'Human resources channel', writersCount: 2, noticesCount: 3, canRename: true, canToggle: true, canAddWriter: true, canRemoveWriter: true });
export const legal = channelOf('legal', { nameAr: 'Legal affairs ar', nameEn: 'Legal affairs', unit: { id: 'u2', nameAr: 'Legal dept ar', nameEn: 'Legal dept' }, canRename: true, canToggle: true, canDelete: true, canAddWriter: true });
export const off = channelOf('old', { nameAr: 'Old channel ar', nameEn: 'Old channel', isActive: false, canToggle: true, canDelete: true });

export function serve(keys = MANAGER, channels = [hr, legal, off], canCreate = true) {
  const account = me(keys);
  server.use(
    http.get('*/api/me', () => HttpResponse.json(account)),
    http.get('*/api/notices/channels', () => HttpResponse.json({ channels, settings: null, canCreate })),
  );
}

