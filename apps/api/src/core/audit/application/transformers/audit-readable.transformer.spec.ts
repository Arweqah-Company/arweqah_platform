import { describe, expect, it } from 'vitest';
import { idsIn, readable } from './audit-readable.transformer';

const ROLE = '11111111-2222-4333-8444-555555555555';
const names = new Map([[ROLE, { ar: 'مدير الموارد', en: 'HR manager' }]]);

describe('The audit log read by a person', () => {
  it('finds every id, also inside lists', () => {
    expect(idsIn({ roleIds: [ROLE, 'not-an-id'], n: 3, who: ROLE })).toEqual([ROLE, ROLE]);
    expect(idsIn(null)).toEqual([]);
  });

  it('gives a label for each key and a name for each id, in both languages', () => {
    const details = readable({ roleIds: [ROLE], withEndDate: 0, applied: true, password: '[redacted]', fields: ['profession', 'workPhone'] }, names);
    expect(details).toEqual([
      { label: { ar: 'الأدوار', en: 'Roles' }, value: { ar: 'مدير الموارد', en: 'HR manager' } },
      { label: { ar: 'أدوار لها تاريخ انتهاء', en: 'Roles with an end date' }, value: { ar: '0', en: '0' } },
      { label: { ar: 'طُبّق فورًا', en: 'Applied at once' }, value: { ar: 'نعم', en: 'Yes' } },
      { label: { ar: 'password', en: 'password' }, value: { ar: 'مخفي', en: 'Hidden' } },
      { label: { ar: 'البيانات التي تغيّرت', en: 'Details that changed' }, value: { ar: 'المهنة، هاتف العمل', en: 'Profession, Work phone' } },
    ]);
    expect(readable(null, names)).toBeNull();
  });

  it('shows an id with no name as it is and an empty value as a dash', () => {
    expect(readable({ managerId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', reason: null }, new Map())?.map((d) => d.value.en)).toEqual(['aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', '—']);
  });
});
