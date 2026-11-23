import { CorePermission } from '@arweqah-platform/shared';
import { Megaphone, PenLine, ShieldCheck, Waypoints } from 'lucide-react';
import { PAGE_MAIN_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';
import { ApprovalsBadge, AwaitingBadge } from './shared/nav-badges';

export { NoticesHomeSection } from './home/notices-home-section';
export { AwaitingNoticesBanner } from './shared/awaiting-banner';

export const noticesFeature: FeatureModule = {
  id: 'notices',
  routes: [
    { path: '/notices', lazy: () => import('./mine/mine-page').then((m) => ({ Component: m.MyNoticesPage })) },
    { path: '/notices/manage', lazy: () => import('./manage/manage-page').then((m) => ({ Component: m.ManageNoticesPage })) },
    { path: '/notices/approvals', lazy: () => import('./approvals/approvals-page').then((m) => ({ Component: m.ApprovalsPage })) },
    { path: '/notices/channels', lazy: () => import('./channels/channels-page').then((m) => ({ Component: m.ChannelsPage })) },
  ],
  // «My notices» is a top-level link under Home; the writer's, the approver's and the channels pages sit in one menu, each for the key it needs (a menu with one page is that page's link).
  nav: [
    { to: '/notices', labelKey: 'nav.notices', icon: Megaphone, rank: 2, end: true, pageKey: 'notices', permission: CorePermission.NoticesView, badge: AwaitingBadge },
    { to: '/notices/manage', labelKey: 'nav.noticesManage', icon: PenLine, group: 'notices', pageKey: 'notices-manage', permission: CorePermission.NoticesManageView },
    { to: '/notices/approvals', labelKey: 'nav.noticesApprovals', icon: ShieldCheck, group: 'notices', pageKey: 'notices-approvals', permission: CorePermission.NoticesApproveView, badge: ApprovalsBadge },
    { to: '/notices/channels', labelKey: 'nav.noticesChannels', icon: Waypoints, group: 'notices', pageKey: 'notices-channels', permission: CorePermission.NoticesChannelsView },
  ],
  tour: [
    { key: 'notices-home', target: '[data-tour="pinned-notice"], [data-tour="main-list"]', route: '/', placement: 'auto' },
    { key: 'notices-my', target: PAGE_MAIN_TARGET, route: '/notices', placement: 'auto', can: [{ id: 'acknowledge', permission: CorePermission.NoticesAcknowledge }, { id: 'export', permission: CorePermission.NoticesExportMine }] },
    { key: 'notices-manage', target: PAGE_MAIN_TARGET, route: '/notices/manage', placement: 'auto', can: [{ id: 'create', permission: CorePermission.NoticesCreate }, { id: 'submit', permission: CorePermission.NoticesSubmit }, { id: 'pin', permission: CorePermission.NoticesPin }, { id: 'revise', permission: CorePermission.NoticesRevise }, { id: 'ack_report', permission: CorePermission.NoticesAckReport }] },
    { key: 'notices-approvals', target: PAGE_MAIN_TARGET, route: '/notices/approvals', placement: 'auto', can: [{ id: 'approve', permission: CorePermission.NoticesApprove }, { id: 'reject', permission: CorePermission.NoticesReject }] },
    { key: 'notices-channels', target: PAGE_MAIN_TARGET, route: '/notices/channels', placement: 'auto', can: [{ id: 'writers', permission: CorePermission.NoticesWriterAdd }, { id: 'channels', permission: CorePermission.NoticesChannelAdd }, { id: 'channel_remove', permission: CorePermission.NoticesChannelRemove }, { id: 'settings', permission: CorePermission.NoticesSettingsEdit }] },
  ],
  i18n: { ar, en },
};
