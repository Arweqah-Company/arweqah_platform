import type { PermissionTargetDto } from '@arweqah-platform/shared';

/**
 * What the export file holds: the permissions placed on the target itself, as saved (not a draft and not what reaches it from elsewhere),
 * sorted by key, in the shape the seeders use: `{ key, scope, fields? }`.
 */
export function grantsExport(target: PermissionTargetDto): { filename: string; json: string } {
  const permissions = [...target.permissions]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((p) => ({ key: p.key, scope: p.scope, ...(p.fields?.length ? { fields: [...p.fields].sort() } : {}) }));
  const body = { kind: target.kind, nameAr: target.nameAr, nameEn: target.nameEn, permissions };
  const slug = target.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || target.id;
  return { filename: `permissions-${target.kind}-${slug}-${new Date().toISOString().slice(0, 10)}.json`, json: `${JSON.stringify(body, null, 2)}\n` };
}
