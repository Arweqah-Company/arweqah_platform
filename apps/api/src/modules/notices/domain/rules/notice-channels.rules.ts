import { CorePermission, type NoticeChannelCode } from '@arweqah-platform/shared';
import type { ChannelRow } from '../types/notice.types';

/** The first two publishing channels (decision N1), made with their writer roles when missing; the unit names say where each belongs (decision 445). */
export interface NoticeChannelSeed {
  code: NoticeChannelCode;
  nameAr: string;
  nameEn: string;
  roleNameAr: string;
  roleNameEn: string;
  /** The names of the unit the channel belongs to, the best match first; none found = a company-wide channel. */
  unitNames: string[];
}

export const NOTICE_CHANNEL_SEEDS: NoticeChannelSeed[] = [
  {
    code: 'hr',
    nameAr: 'قناة الموارد البشرية',
    nameEn: 'Human resources channel',
    roleNameAr: 'كاتب تعاميم — الموارد البشرية',
    roleNameEn: 'Notice writer — Human resources',
    unitNames: ['إدارة الموارد البشرية', 'Human Resources Department', 'قسم الموارد البشرية والخدمات الإدارية', 'HR & Administrative Services Section'],
  },
  {
    code: 'corporate_comms',
    nameAr: 'قناة التواصل المؤسسي',
    nameEn: 'Corporate communications channel',
    roleNameAr: 'كاتب تعاميم — التواصل المؤسسي',
    roleNameEn: 'Notice writer — Corporate communications',
    unitNames: ['إدارة التواصل المؤسسي', 'Corporate Communications Department'],
  },
];

const CODE_MAX = 60;

/** The slug of a channel from its English name (`Legal affairs` → `legal_affairs`), made unique among `taken` by a number; it never changes after the channel exists. */
export function channelCodeFrom(nameEn: string, taken: ReadonlySet<string>): NoticeChannelCode {
  const base = nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, CODE_MAX - 4) || 'channel';
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

/** The name of the system role a channel's writers hold. */
export function writerRoleNames(channel: { nameAr: string; nameEn: string }): { nameAr: string; nameEn: string } {
  return { nameAr: `كاتب تعاميم — ${channel.nameAr}`, nameEn: `Notice writer — ${channel.nameEn}` };
}

/** Two names are the same channel name when they match without regard to case and the spaces around them. */
export const sameName = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

export interface ChannelAbilities {
  canAddWriter: boolean;
  canRemoveWriter: boolean;
  canRename: boolean;
  canToggle: boolean;
  canDelete: boolean;
}

/**
 * What a person may do with a channel: each icon needs its key to reach the channel's unit; adding a writer also needs the channel to be enabled, and deleting needs it to
 * have never had a notice. `reaches` answers for one key.
 */
export function channelAbilities(row: Pick<ChannelRow, 'isActive' | 'noticesCount'>, reaches: (key: string) => boolean): ChannelAbilities {
  const toggle = reaches(CorePermission.NoticesChannelRemove);
  return {
    canAddWriter: row.isActive && reaches(CorePermission.NoticesWriterAdd),
    canRemoveWriter: reaches(CorePermission.NoticesWriterRemove),
    canRename: reaches(CorePermission.NoticesChannelAdd),
    canToggle: toggle,
    canDelete: toggle && row.noticesCount === 0,
  };
}

/** A channel is shown to anybody whose keys reach its unit (even one that can only add writers to a channel that is disabled). */
export const MANAGER_KEYS: readonly string[] = [CorePermission.NoticesWriterAdd, CorePermission.NoticesWriterRemove, CorePermission.NoticesChannelAdd, CorePermission.NoticesChannelRemove];
