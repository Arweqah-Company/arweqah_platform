import { CorePermission, type AccessSourceDto } from '@arweqah-platform/shared';
import type { GrantSourceRow } from './access.repository';

/** Does this source count right now? A grant of an administrative role waits for platform admin mode, except `admin_mode.use` itself. */
export function isInForce(row: GrantSourceRow, adminModeOn: boolean): boolean {
  return !row.elevated || row.key === CorePermission.AdminModeUse || adminModeOn;
}

/** The sources of each permission key that are in force, in the order given. */
export function sourcesByKey(rows: GrantSourceRow[], adminModeOn: boolean): Map<string, AccessSourceDto[]> {
  const byKey = new Map<string, AccessSourceDto[]>();
  for (const row of rows.filter((r) => isInForce(r, adminModeOn))) {
    const list = byKey.get(row.key) ?? [];
    if (!list.some((s) => s.kind === row.kind && s.nameAr === row.nameAr && s.nameEn === row.nameEn)) list.push({ kind: row.kind, nameAr: row.nameAr, nameEn: row.nameEn });
    byKey.set(row.key, list);
  }
  return byKey;
}
