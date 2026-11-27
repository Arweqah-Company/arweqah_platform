import { screen, within } from '@testing-library/react';
import { LifeBuoy, Users } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import type { NavItem } from '@/core/feature';
import { NavContext } from '@/core/navigation';
import { renderRoute } from '../../../test/render';
import { PageHeader } from './page-header';

const nav = [{ to: '/employees', labelKey: 'nav.employees', icon: Users, group: 'people' as const }];
const ticketsNav = [{ to: '/tickets', labelKey: 'nav.tickets', icon: LifeBuoy, group: 'tickets' as const, end: true }];
const at = (path: string, title: string, items: NavItem[] = nav) => renderRoute([{ path: '*', element: <NavContext.Provider value={items}><PageHeader title={title} /></NavContext.Provider> }], path);

describe('Breadcrumb of the page header', () => {
  it('shows home, the menu group and the page for a page of the menu', () => {
    at('/employees', 'الموظفون');
    const trail = within(screen.getByRole('navigation', { name: 'مسار التنقل' }));
    expect(trail.getByText('الموارد البشرية')).toBeInTheDocument();
    expect(trail.getByText('الموظفون')).toHaveAttribute('aria-current', 'page');
  });

  it('adds the list as a link for a page inside it', () => {
    at('/employees/e1', 'خالد المدير');
    const trail = within(screen.getByRole('navigation', { name: 'مسار التنقل' }));
    expect(trail.getByRole('link', { name: 'الموظفون' })).toHaveAttribute('href', '/employees');
    expect(trail.getByText('خالد المدير')).toHaveAttribute('aria-current', 'page');
  });

  it('shows only home and the page when the page is not in the menu', () => {
    at('/unknown', 'صفحة');
    expect(within(screen.getByRole('navigation', { name: 'مسار التنقل' })).getAllByRole('listitem').filter((li) => !li.hasAttribute('aria-hidden'))).toHaveLength(2);
  });

  it('says the name once when the menu group and its main page are called the same («Tickets › Tickets»)', () => {
    at('/tickets', 'التذاكر', ticketsNav);
    const items = within(screen.getByRole('navigation', { name: 'مسار التنقل' })).getAllByRole('listitem').filter((li) => !li.hasAttribute('aria-hidden'));
    expect(items).toHaveLength(2); // home and the page
    expect(items[1]).toHaveTextContent('التذاكر');
    expect(items[1]).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the list link above a page inside it, and says the name once there too', () => {
    at('/tickets/t1', 'TKT-000001 · الطابعة', ticketsNav);
    const trail = within(screen.getByRole('navigation', { name: 'مسار التنقل' }));
    expect(trail.getByRole('link', { name: 'التذاكر' })).toHaveAttribute('href', '/tickets');
    expect(trail.getAllByText('التذاكر')).toHaveLength(1); // the group and the list share a name: only the link stays
  });
});
