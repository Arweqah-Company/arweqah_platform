import { defaultCommentMatrix, type CommentRulesDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { CommentRulesSection } from './comment-rules-section';

const rules = (): CommentRulesDto => ({ companyId: 'company-1', rules: defaultCommentMatrix() });

function serve(canEdit: boolean) {
  const saved: unknown[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(canEdit ? [{ key: 'tasks.comment_rules_edit', scope: 'all' }] : []))),
    http.get('*/api/task-comment-rules', () => HttpResponse.json(rules())),
    http.put('*/api/task-comment-rules', async ({ request }) => {
      saved.push(await request.json());
      return HttpResponse.json(rules());
    }),
  );
  return saved;
}

describe('Comment rules matrix (FR-66)', () => {
  it('shows a row per relation and a column per action, with the cells as set', async () => {
    serve(true);
    renderPage(<CommentRulesSection companyId="company-1" />);
    expect(await screen.findByRole('columnheader', { name: 'رفع ملف' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(9);
    expect(screen.getByRole('checkbox', { name: 'المسند إليه · صلاحية رفع ملف' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'المذكور بـ @ · صلاحية رفع ملف' })).not.toBeChecked();
  });

  it('saves the whole matrix after a cell is changed', async () => {
    const saved = serve(true);
    renderPage(<CommentRulesSection companyId="company-1" />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'المتابع · صلاحية كتابة تعليق' }));
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(saved).toHaveLength(1));
    const sent = saved[0] as { rules: ReturnType<typeof defaultCommentMatrix> };
    expect(sent.rules.follower.write).toBe(false);
    expect(sent.rules.assignee.write).toBe(true);
  });

  it('is read-only without the edit key: cells disabled and no save button', async () => {
    serve(false);
    renderPage(<CommentRulesSection companyId="company-1" />);
    expect(await screen.findByRole('checkbox', { name: 'المتابع · صلاحية كتابة تعليق' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'حفظ' })).not.toBeInTheDocument();
  });
});
