import { CorePermission, type MyProgressDto } from '@arweqah-platform/shared';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { LearningBadges } from './learning-badges';

const learning = {
  badges: [
    { name: 'وسام الأساس', condition: 'إتمام الإلزامي', hours: 35 },
    { name: 'وسام الكفاءة', condition: 'الإلزامي والضروري', hours: 65 },
  ],
  rule: 'ويبلغ الموظف الوسام بإتمام شرطه',
  periods: [],
};
const progress = (over: Partial<MyProgressDto> = {}): MyProgressDto => ({
  requiredDone: [], approvedMinutes: 2430, unitsDone: 5, unitsTotal: 12, waiting: 0,
  badges: [{ name: 'وسام الأساس', hours: 35, reached: true }, { name: 'وسام الكفاءة', hours: 65, reached: false }],
  nextBadge: { name: 'وسام الكفاءة', hours: 65, missingMinutes: 1470 }, budget: { cap: 3000, spent: 0 }, competencies: [], ...over,
});

function open(data: MyProgressDto | null, preview = false) {
  const person = me([{ key: CorePermission.CareerProfileView, scope: 'all' }]);
  server.use(http.get('*/api/me', () => HttpResponse.json(person)), http.get('*/api/career-profile/me/progress', () => (data ? HttpResponse.json(data) : HttpResponse.json({}, { status: 500 }))));
  renderPage(<LearningBadges learning={learning} preview={preview} />);
}

describe('The medals of the learning plan (FR-111, FR-114)', () => {
  it('shows the approved hours and the next medal, then a card per medal with its progress and how far it is', async () => {
    open(progress());
    expect(await screen.findByText('40.5')).toBeInTheDocument();
    expect(screen.getByText('ساعة منجزة')).toBeInTheDocument();
    expect(screen.getByText('الوسام التالي: وسام الكفاءة · عند 65 ساعة')).toBeInTheDocument();
    expect(screen.getByText('40.5 من 35 ساعة')).toBeInTheDocument();
    expect(screen.getByText('40.5 من 65 ساعة')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'وسام الأساس' })).toHaveAttribute('value', '100');
    expect(screen.getByRole('progressbar', { name: 'وسام الكفاءة' })).toHaveAttribute('value', '62');
    expect(screen.getByText('ويبلغ الموظف الوسام بإتمام شرطه')).toBeInTheDocument();
  });

  it('says a medal was reached in words (not only by the filled icon), and only for the reached one', async () => {
    open(progress());
    await screen.findByText('40.5');
    const first = screen.getByText('وسام الأساس').closest('div')?.parentElement as HTMLElement;
    expect(within(first).getByText('نلتَه')).toBeInTheDocument();
    const second = screen.getByText('وسام الكفاءة').closest('div')?.parentElement as HTMLElement;
    expect(within(second).queryByText('نلتَه')).not.toBeInTheDocument();
  });

  it('says every medal was reached when there is no next one', async () => {
    open(progress({ approvedMinutes: 4200, nextBadge: null, badges: [{ name: 'وسام الأساس', hours: 35, reached: true }, { name: 'وسام الكفاءة', hours: 65, reached: true }] }));
    expect(await screen.findByText('بلغتَ كل الأوسمة')).toBeInTheDocument();
  });

  it('shows only the thresholds in HR\'s preview: nobody\'s hours, no bars', async () => {
    open(null, true);
    expect(await screen.findByText('العتبة: 35 ساعة')).toBeInTheDocument();
    expect(screen.getByText('العتبة: 65 ساعة')).toBeInTheDocument();
    expect(screen.queryByText('ساعة منجزة')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
