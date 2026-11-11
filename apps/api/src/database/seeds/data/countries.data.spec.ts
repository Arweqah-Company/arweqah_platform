import { describe, expect, it } from 'vitest';
import { COUNTRIES } from './countries.data';

describe('the countries list', () => {
  it('has no Israel and names Palestine «فلسطين» / «Palestine»', () => {
    expect(COUNTRIES.some((c) => c.iso === 'IL' || /إسرائيل|Israel/.test(c.nameAr + c.nameEn))).toBe(false);
    expect(COUNTRIES.find((c) => c.iso === 'PS')).toMatchObject({ nameAr: 'فلسطين', nameEn: 'Palestine', currency: 'ILS' });
  });
});
