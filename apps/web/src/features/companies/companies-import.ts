import { upsertCompanySchema } from '@arweqah-platform/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/core/api/api-client';
import { flagDuplicates, RowChecker, zodMessages } from '@/shared/data-exchange/mapping';
import type { ImportColumn, PreparedRow, SheetRow } from '@/shared/data-exchange/types';

/** Import of companies from a file: code, Arabic and English name, and whether the company is active. */
export function useCompaniesImport() {
  const { t } = useTranslation('companies');
  const { t: common } = useTranslation();
  const client = useQueryClient();
  const yesNo = [common('dataExchange.yes'), common('dataExchange.no')];
  const columns: ImportColumn[] = [
    { id: 'code', header: t('code'), required: true },
    { id: 'nameAr', header: t('nameAr'), required: true },
    { id: 'nameEn', header: t('nameEn'), required: true },
    { id: 'isActive', header: t('status'), options: yesNo },
  ];
  const headers = Object.fromEntries(columns.map((c) => [c.id, c.header]));

  const prepare = (rows: SheetRow[]): PreparedRow[] => {
    const duplicates = flagDuplicates(rows.map((r) => ({ rowNumber: r.rowNumber, value: r.cells.code?.toUpperCase() || null })), headers.code as string, common);
    return rows.map((row) => {
      const check = new RowChecker(common, row.cells, headers);
      const input = { code: check.text('code', true), nameAr: check.text('nameAr', true), nameEn: check.text('nameEn', true), isActive: check.yesNo('isActive') ?? true };
      const parsed = upsertCompanySchema.safeParse(input);
      const errors = [...check.errors, ...(check.errors.length || parsed.success ? [] : zodMessages(parsed.error, headers, common)), ...(duplicates.has(row.rowNumber) ? [duplicates.get(row.rowNumber) as string] : [])];
      return { rowNumber: row.rowNumber, errors, run: errors.length || !parsed.success ? undefined : async () => { await apiClient.post('/companies', parsed.data); } };
    });
  };

  return { filename: 'companies', columns, prepare, onImported: () => void client.invalidateQueries({ queryKey: ['companies'] }) };
}
