import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { version, versionsDto } from '../../../test/org-fixtures';
import { openOrgPage } from '../../../test/org-harness';

beforeEach(() => window.localStorage.clear());

async function openHistory(dto: ReturnType<typeof versionsDto>) {
  openOrgPage({ handlers: [http.get('*/api/org/nodes/:id/versions', () => HttpResponse.json(dto))] });
  fireEvent.click(await screen.findByRole('button', { name: 'قسم الموارد البشرية' }));
  const details = await screen.findByRole('complementary', { name: 'تفاصيل الوحدة: قسم الموارد البشرية' });
  fireEvent.click(within(details).getByRole('tab', { name: 'السجل' }));
  return details;
}

describe('The history tab of a unit (FR-99)', () => {
  it('draws the versions newest first with their state, dates and reasons', async () => {
    const details = await openHistory(versionsDto({
      versions: [
        version({ id: 'v3', status: 'scheduled', validFrom: '2099-01-01', nameAr: 'قسم الموارد والكفاءات', reason: 'توسعة الاختصاص' }),
        version({ id: 'v2', status: 'current', validFrom: '2025-06-01', validTo: null, nameAr: 'قسم الموارد البشرية', reason: 'تغيير الاسم' }),
        version({ id: 'v1', status: 'past', validFrom: '2024-01-01', validTo: '2025-05-31', nameAr: 'قسم شؤون الموظفين', reason: 'التأسيس' }),
      ],
    }));
    const timeline = await within(details).findByRole('list', { name: 'نسخ الوحدة عبر الزمن' });
    const items = within(timeline).getAllByRole('listitem');
    expect(items.map((i) => i.getAttribute('data-status'))).toEqual(['scheduled', 'current', 'past']);
    expect(within(items[0] as HTMLElement).getByText('مجدول')).toBeInTheDocument();
    expect(within(items[0] as HTMLElement).getByText('قسم الموارد والكفاءات')).toBeInTheDocument();
    expect(within(items[1] as HTMLElement).getByText('سارٍ')).toBeInTheDocument();
    expect(within(items[2] as HTMLElement).getByText('سابق')).toBeInTheDocument();
    expect(items[2]).toHaveTextContent('من 2024-01-01 إلى 2025-05-31 · التأسيس');
  });

  it('lists the change log with the actor and the reason, and keeps the explanatory note', async () => {
    const details = await openHistory(versionsDto({ log: [{ id: 'a1', action: 'org.unit.updated', actorName: 'سارة أحمد', reason: 'تصحيح الاسم', createdAt: '2026-11-04T09:30:00Z' }, { id: 'a2', action: 'org.something.new', actorName: null, reason: null, createdAt: '2026-11-03T09:30:00Z' }] }));
    expect(await within(details).findByText('عُدّلت الوحدة')).toBeInTheDocument();
    expect(within(within(details).getByRole('table', { name: 'سجل التعديلات' })).getByText(/سارة أحمد/)).toBeInTheDocument();
    expect(within(details).getByText('السبب: تصحيح الاسم')).toBeInTheDocument();
    expect(within(details).getByText('org.something.new')).toBeInTheDocument(); // an action the screen does not know is shown as recorded
    expect(within(details).getByText(/تعديل الوحدة اليوم لا يغيّر سجل الأمس/)).toBeInTheDocument();
  });

  it('says so when no change was recorded', async () => {
    const details = await openHistory(versionsDto());
    expect(await within(details).findByText('لا تعديلات مسجلة بعد.')).toBeInTheDocument();
  });
});
