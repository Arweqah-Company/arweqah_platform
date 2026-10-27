import { CorePermission as P, type TaskMatrixDto } from '@arweqah-platform/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { taskItem } from '../../../../test/task-fixtures';
import { MatrixSection } from './matrix-section';
import { chooseOption } from '../../../../test/select';

const matrix = (): TaskMatrixDto => ({
  quadrants: [
    { key: 'important_urgent', total: 1, items: [taskItem({ id: 'a', title: 'عاجلة ومهمة', priority: 'high' })] },
    { key: 'important_not_urgent', total: 0, items: [] },
    { key: 'normal_urgent', total: 1, items: [taskItem({ id: 'b', title: 'عاجلة فقط' })] },
    { key: 'normal_not_urgent', total: 0, items: [] },
  ],
});

function serve(scope: 'own' | 'subtree') {
  const scopes: string[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me([{ key: P.TasksMatrixView, scope }]))),
    http.get('*/api/tasks/matrix', ({ request }) => {
      scopes.push(new URL(request.url).searchParams.get('scope') ?? '');
      return HttpResponse.json(matrix());
    }),
  );
  return scopes;
}

describe('The task matrix section (FR-49)', () => {
  it('shows the four squares with their questions, counts and tasks', async () => {
    serve('own');
    renderPage(<MatrixSection />);
    const urgent = await screen.findByRole('region', { name: /مهمة وعاجلة/ });
    expect(within(urgent).getByText('عاجلة ومهمة')).toBeInTheDocument();
    expect(within(await screen.findByRole('region', { name: /عاجلة وغير مهمة/ })).getByText('عاجلة فقط')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /مهمة وغير عاجلة/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /لا هذه ولا تلك/ })).toBeInTheDocument();
    expect(screen.getAllByText('لا مهام هنا')).toHaveLength(2);
  });

  it('offers the team only to a person whose matrix key reaches beyond themselves', async () => {
    serve('own');
    const own = renderPage(<MatrixSection />);
    await screen.findByRole('region', { name: /مهمة وعاجلة/ });
    expect(screen.queryByLabelText('عرض')).not.toBeInTheDocument();
    own.unmount();
    const scopes = serve('subtree');
    renderPage(<MatrixSection />);
    await chooseOption((await screen.findByLabelText('عرض')), 'team');
    await waitFor(() => expect(scopes).toContain('team'));
  });
});
