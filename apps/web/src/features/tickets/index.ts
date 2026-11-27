import { CorePermission } from '@arweqah-platform/shared';
import { BarChart3, LifeBuoy, SlidersHorizontal } from 'lucide-react';
import { PAGE_MAIN_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export { ProblemReportButton } from './problem-report/problem-report-button';
export { ProblemReportSettingsTab } from './problem-report/problem-report-settings-tab';
export { PROBLEM_REPORT_KEYS } from './problem-report/keys';

export const ticketsFeature: FeatureModule = {
  id: 'tickets',
  routes: [
    { path: '/tickets', lazy: () => import('./tickets-page').then((m) => ({ Component: m.TicketsPage })) },
    { path: '/tickets/setup', lazy: () => import('./setup/setup-page').then((m) => ({ Component: m.SetupPage })) },
    { path: '/tickets/figures', lazy: () => import('./figures-page').then((m) => ({ Component: m.FiguresPage })) },
    { path: '/tickets/:id', lazy: () => import('./details/ticket-details-page').then((m) => ({ Component: m.TicketDetailsPage })) },
  ],
  // Every employee sends tickets; the setup and figures pages appear to whoever holds their key (a unit head has them for the unit and below), with no admin mode.
  nav: [
    { to: '/tickets', labelKey: 'nav.tickets', icon: LifeBuoy, group: 'tickets', end: true, pageKey: 'tickets' },
    { to: '/tickets/setup', labelKey: 'nav.ticketSetup', icon: SlidersHorizontal, group: 'tickets', pageKey: 'ticket-setup', permission: CorePermission.TicketsSetupView },
    { to: '/tickets/figures', labelKey: 'nav.ticketFigures', icon: BarChart3, group: 'tickets', pageKey: 'ticket-figures', permission: CorePermission.TicketsFiguresView },
  ],
  tour: [
    { key: 'tickets', target: PAGE_MAIN_TARGET, route: '/tickets', placement: 'auto', can: [{ id: 'create', permission: CorePermission.TicketsCreate }, { id: 'reply', permission: CorePermission.TicketsReply }, { id: 'request_close', permission: CorePermission.TicketsRequestClose }, { id: 'confirm_close', permission: CorePermission.TicketsConfirmClose }, { id: 'reopen', permission: CorePermission.TicketsReopen }, { id: 'comment_reply', permission: CorePermission.TicketsCommentReply }, { id: 'comment_mention', permission: CorePermission.TicketsCommentMention }, { id: 'reassign', permission: CorePermission.TicketsReassign }, { id: 'setup', permission: CorePermission.TicketsSetupView }, { id: 'figures', permission: CorePermission.TicketsFiguresView }] },
    { key: 'ticket-new', target: '[data-tour="ticket-new"]', route: '/tickets', placement: 'bottom', can: [{ id: 'reply', permission: CorePermission.TicketsReply }] },
    { key: 'ticket-views', target: '[data-tour="view-switch"]', route: '/tickets', placement: 'bottom', can: [{ id: 'reply', permission: CorePermission.TicketsReply }, { id: 'request_close', permission: CorePermission.TicketsRequestClose }, { id: 'confirm_close', permission: CorePermission.TicketsConfirmClose }] },
  ],
  i18n: { ar, en },
};
