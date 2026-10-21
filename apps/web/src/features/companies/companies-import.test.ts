import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useCompaniesImport } from './companies-import';

const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: new QueryClient() }, children);

describe('Companies import (FR-29)', () => {
  it('accepts valid rows, and flags missing, malformed and duplicated values with the row', () => {
    const { result } = renderHook(() => useCompaniesImport(), { wrapper });
    const rows = [
      { rowNumber: 2, cells: { code: 'new1', nameAr: 'شركة', nameEn: 'Company', isActive: 'نعم' } },
      { rowNumber: 3, cells: { code: 'x', nameAr: 'شركة', nameEn: 'Company', isActive: '' } },
      { rowNumber: 4, cells: { code: 'NEW1', nameAr: '', nameEn: 'Company', isActive: 'maybe' } },
    ];
    const [ok, badCode, dup] = result.current.prepare(rows);
    expect(ok?.errors).toEqual([]);
    expect(ok?.run).toBeTypeOf('function');
    expect(badCode?.run).toBeUndefined();
    expect(badCode?.errors.join(' ')).toContain('«الرمز»: الصيغة غير صحيحة');
    expect(dup?.errors.length).toBeGreaterThanOrEqual(3);
    expect(dup?.errors.join(' ')).toContain('«الرمز» = «NEW1»');
  });
});
