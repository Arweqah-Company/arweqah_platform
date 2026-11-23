import type { Paginated } from '@arweqah-platform/shared';
import type {
  AckFilters,
  AckRow,
  AckSummary,
  ApprovalsListFilters,
  FlowRow,
  ManageListFilters,
  MineListFilters,
  MineRow,
  NoticeListRow,
  NoticeListViewer,
  PersonRow,
} from '../types/notice.types';

/** The read side: lists, details headers, the reports and the figures of the home page. All filters, searches and scopes run in the SQL. */
export abstract class NoticeQueryRepository {
  abstract listManage(filters: ManageListFilters): Promise<Paginated<NoticeListRow>>;
  /** The size of the «my drafts» and «waiting for approval» tabs of the manage list. */
  abstract manageCounts(viewer: NoticeListViewer): Promise<{ mine: number; pending: number }>;
  abstract listApprovals(filters: ApprovalsListFilters): Promise<Paginated<NoticeListRow>>;
  abstract approvalsCount(viewer: NoticeListViewer): Promise<number>;
  abstract headerOf(noticeId: string): Promise<NoticeListRow | null>;
  abstract authors(viewer: NoticeListViewer): Promise<PersonRow[]>;

  abstract listMine(filters: MineListFilters): Promise<Paginated<MineRow> & { awaiting: number }>;
  /** The channels that have a notice delivered to the person (the choices of the channel filter of «My notices»). */
  abstract mineChannels(userId: string): Promise<{ code: string; nameAr: string; nameEn: string; isActive: boolean }[]>;
  abstract mineOne(userId: string, noticeId: string): Promise<MineRow | null>;
  abstract home(userId: string): Promise<{ awaiting: number; newThisWeek: number; pinned: MineRow | null; awaitingTop: MineRow[]; drafts: number }>;

  abstract acknowledgements(filters: AckFilters): Promise<Paginated<AckRow>>;
  abstract ackSummary(filters: Pick<AckFilters, 'noticeId' | 'currentVersion' | 'unitScope'>): Promise<AckSummary & { pending: number }>;
  abstract joinedLater(noticeId: string): Promise<number>;
  abstract flow(noticeId: string): Promise<FlowRow[]>;
}
