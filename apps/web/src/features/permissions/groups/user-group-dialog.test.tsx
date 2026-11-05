import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { UserGroupDialog } from './user-group-dialog';

describe('The members of a group of people (FR-46)', () => {
  it('shows the matching people from the first letter typed', async () => {
    const asked: string[] = [];
    server.use(http.get('*/api/user-groups/people', ({ request }) => {
      asked.push(new URL(request.url).searchParams.get('q') ?? '');
      return HttpResponse.json([{ id: 'u1', nameAr: 'سارة' }]);
    }));
    renderPage(<UserGroupDialog group={null} onClose={() => undefined} />);
    fireEvent.change(await screen.findByLabelText('ابحث عن شخص لإضافته'), { target: { value: 'س' } });
    expect(await screen.findByRole('button', { name: 'سارة' })).toBeInTheDocument();
    await waitFor(() => expect(asked).toEqual(['س']));
  });
});
