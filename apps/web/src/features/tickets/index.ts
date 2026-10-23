import { BarChart3, LifeBuoy, SlidersHorizontal } from 'lucide-react';
import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const ticketsFeature: FeatureModule = {
  id: 'tickets',
  routes: [
    { path: '/tickets', lazy: () => import('./tickets-page').then((m) => ({ Component: m.TicketsPage })) },
    { path: '/tickets/setup', lazy: () => import('./setup/setup-page').then((m) => ({ Component: m.SetupPage })) },
    { path: '/tickets/figures', lazy: () => import('./figures-page').then((m) => ({ Component: m.FiguresPage })) },
    { path: '/tickets/:id', lazy: () => import('./details/ticket-details-page').then((m) => ({ Component: m.TicketDetailsPage })) },
  ],
  // Every employee sends tickets; the two admin pages appear only while platform admin mode is on.
  nav: [
    { to: '/tickets', labelKey: 'nav.tickets', icon: LifeBuoy, group: 'tickets', end: true, pageKey: 'tickets' },
    { to: '/tickets/setup', labelKey: 'nav.ticketSetup', icon: SlidersHorizontal, group: 'tickets', requiresAdminMode: true, pageKey: 'ticket-setup' },
    { to: '/tickets/figures', labelKey: 'nav.ticketFigures', icon: BarChart3, group: 'tickets', requiresAdminMode: true, pageKey: 'ticket-figures' },
  ],
  i18n: { ar, en },
};
