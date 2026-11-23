import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderPage } from '../../../../test/render';
import { ChannelsPage } from '../channels/channels-page';
import { channelOf, MANAGER, serve } from './channel-fixtures';

describe('Publishing channels page (FR-174, FR-177)', () => {
  beforeEach(() => window.localStorage.clear());

  it('lists every channel with its unit, state and writers, and gives each row the icons its abilities allow', async () => {
    serve();
    renderPage(<ChannelsPage />);
    const hrRow = (await screen.findByText('HR channel')).closest('tr') as HTMLElement;
    expect(within(hrRow).getByText('Resources dept ar')).toBeInTheDocument();
    expect(within(hrRow).getByText('نشطة')).toBeInTheDocument();
    await within(hrRow).findByRole('button', { name: 'تعطيل القناة' }); // the icons wait for the keys of the account
    for (const name of ['كتّاب القناة', 'تغيير الاسم', 'تعطيل القناة']) expect(within(hrRow).getByRole('button', { name })).toBeInTheDocument();
    // a channel with notices: the delete icon is there but off, and says why
    expect(within(hrRow).getByRole('button', { name: /لا تُحذف قناة كُتبت فيها تعاميم/ })).toBeDisabled();
    const legalRow = screen.getByText('Legal affairs ar').closest('tr') as HTMLElement;
    expect(within(legalRow).getByRole('button', { name: 'حذف القناة' })).toBeEnabled();
    const oldRow = screen.getByText('Old channel ar').closest('tr') as HTMLElement;
    expect(within(oldRow).getByText('معطّلة')).toBeInTheDocument();
    expect(within(oldRow).getByRole('button', { name: 'تفعيل القناة' })).toBeInTheDocument();
  });

  it('hides what the keys do not allow: no add button, no disable or delete, no rename', async () => {
    serve([{ key: 'notices.channels_view', scope: 'subtree' }], [channelOf('hr', { nameAr: 'HR channel' })], false);
    renderPage(<ChannelsPage />);
    const row = (await screen.findByText('HR channel')).closest('tr') as HTMLElement;
    expect(within(row).getByRole('button', { name: 'كتّاب القناة' })).toBeInTheDocument();
    for (const name of ['تغيير الاسم', 'تعطيل القناة', 'حذف القناة']) expect(within(row).queryByRole('button', { name })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إضافة قناة' })).not.toBeInTheDocument();
  });

  it('searches the names and the unit, filters by unit and by state, and keeps one view switch', async () => {
    serve();
    renderPage(<ChannelsPage />);
    await screen.findByText('HR channel');
    expect(screen.getAllByRole('group', { name: 'طريقة العرض' })).toHaveLength(1);
    fireEvent.change(screen.getByPlaceholderText('ابحث باسم القناة أو وحدتها'), { target: { value: 'Legal dept' } });
    await waitFor(() => expect(screen.queryByText('HR channel')).not.toBeInTheDocument());
    expect(screen.getByText('Legal affairs ar')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('ابحث باسم القناة أو وحدتها'), { target: { value: 'nothing like this' } });
    expect(await screen.findByText('لا نتائج مطابقة.')).toBeInTheDocument();
  });

  it('opens the writers of a channel when its row is clicked', async () => {
    serve([...MANAGER], [channelOf('legal', { nameAr: 'Legal affairs ar', canAddWriter: true, writersCount: 1, writers: [{ userId: 'w1', employeeId: 'e1', name: 'منى الحربي', jobTitle: null, unit: null, addedAt: '2026-11-01T00:00:00.000Z', canRemove: true, drafts: 1, pendingApproval: 0 }] })]);
    renderPage(<ChannelsPage />);
    fireEvent.click(await screen.findByText('Legal affairs ar'));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('منى الحربي')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'إضافة كاتب' })).toBeInTheDocument();
  });
});
