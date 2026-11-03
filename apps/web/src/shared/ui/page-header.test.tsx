import { screen, within } from '@testing-library/react';
import { Users } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { NavContext } from '@/core/navigation';
import { renderRoute } from '../../../test/render';
import { PageHeader } from './page-header';

const nav = [{ to: '/employees', labelKey: 'nav.employees', icon: Users, group: 'people' as const }];
const at = (path: string, title: string) => renderRoute([{ path: '*', element: <NavContext.Provider value={nav}><PageHeader title={title} /></NavContext.Provider> }], path);

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
});
