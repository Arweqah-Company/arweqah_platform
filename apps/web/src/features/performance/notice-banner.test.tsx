import { CorePermission as P } from '@arweqah-platform/shared';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { EvaluationNoticeBanner } from './notice-banner';

function serve(items: { kind: 'self' | 'team'; path: string; due: { from: string; to: string | null } | null }[]) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me([{ key: P.PerformanceSelfEvaluate, scope: 'own' as const }]))),
    http.get('*/api/performance/me/notices', () => HttpResponse.json({ items })),
  );
  renderPage(<EvaluationNoticeBanner />);
}

describe('The bar «the evaluation cycle is open» (plan §15.2)', () => {
  it('says the cycle is open, gives the deadline of the stage, and takes the person to the screen they work from', async () => {
    serve([{ kind: 'self', path: '/career-profile', due: { from: '2027-03-10', to: null } }]);
    const bar = await screen.findByRole('region', { name: 'تنبيه دورة التقييم' });
    expect(within(bar).getByText('دورة التقييم مفتوحة:')).toBeInTheDocument();
    expect(within(bar).getByText(/تقييمك الذاتي قبل انتهاء الموعد/)).toHaveTextContent('10 مارس 2027');
    expect(within(bar).getByRole('link', { name: 'اذهب إلى تقييمي' })).toHaveAttribute('href', '/career-profile');
  });

  it('shows one bar for each task, with a date range for a stage that has one', async () => {
    serve([{ kind: 'self', path: '/career-profile', due: null }, { kind: 'team', path: '/performance-team', due: { from: '2027-04-21', to: '2027-04-24' } }]);
    const bar = await screen.findByRole('region', { name: 'تنبيه دورة التقييم' });
    expect(await within(bar).findAllByText('دورة التقييم مفتوحة:')).toHaveLength(2);
    expect(within(bar).getByText(/تقييم فريقك/)).toHaveTextContent('من 21 أبريل 2027 إلى 24 أبريل 2027');
    expect(within(bar).getByRole('link', { name: 'اذهب إلى تقييم فريقي' })).toHaveAttribute('href', '/performance-team');
  });

  it('draws nothing when no evaluation task is open', async () => {
    serve([]);
    await screen.findByText(/./, undefined, { timeout: 200 }).catch(() => undefined);
    expect(screen.queryByRole('region', { name: 'تنبيه دورة التقييم' })).not.toBeInTheDocument();
  });
});
